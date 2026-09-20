import networkx as nx
import pandas as pd


def compute_degree_centrality(G: nx.Graph) -> dict[str, float]:
    return nx.degree_centrality(G)


def compute_betweenness_centrality(G: nx.Graph) -> dict[str, float]:
    n = G.number_of_nodes()
    # Exact Brandes for small/medium graphs; sampled approximation above the
    # threshold so large datasets don't stall the dashboard (approx. is fine
    # for structural ranking and is explicitly an estimate).
    if n > 1500:
        k = 400
        return nx.betweenness_centrality(G, k=k, normalized=True, seed=42)
    return nx.betweenness_centrality(G, normalized=True)


def rank_by_centrality(centrality: dict[str, float], top_n: int = 25) -> list[tuple[str, float]]:
    sorted_items = sorted(centrality.items(), key=lambda x: x[1], reverse=True)
    return sorted_items[:top_n]


def centrality_to_df(degree: dict, betweenness: dict, people_df: pd.DataFrame) -> pd.DataFrame:
    status_map = dict(zip(people_df["Person_ID"], people_df["Infection_Status"]))
    records = []
    all_nodes = set(degree.keys()) | set(betweenness.keys())
    for node in all_nodes:
        records.append({
            "Person_ID": node,
            "Degree_Centrality": degree.get(node, 0),
            "Betweenness_Centrality": betweenness.get(node, 0),
            "Infection_Status": status_map.get(node, "Unknown"),
        })
    df = pd.DataFrame(records)
    df["Degree_Rank"] = df["Degree_Centrality"].rank(ascending=False).astype(int)
    df["Betweenness_Rank"] = df["Betweenness_Centrality"].rank(ascending=False).astype(int)
    return df.sort_values("Degree_Centrality", ascending=False)
