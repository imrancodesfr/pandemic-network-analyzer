import networkx as nx
import pandas as pd


def build_person_graph(contacts_df: pd.DataFrame) -> nx.Graph:
    G = nx.Graph()
    edges = contacts_df.groupby(["Person_A", "Person_B"]).agg(
        weight=("Duration", "sum"),
        contact_count=("Duration", "count"),
    ).reset_index()
    for _, row in edges.iterrows():
        G.add_edge(row["Person_A"], row["Person_B"],
                    weight=row["weight"], contact_count=row["contact_count"])
    return G


def get_node_attributes(G: nx.Graph, people_df: pd.DataFrame) -> dict:
    attr = {}
    status_map = dict(zip(people_df["Person_ID"], people_df["Infection_Status"]))
    for node in G.nodes():
        attr[node] = {
            "infection_status": status_map.get(node, "Unknown"),
            "degree": G.degree(node),
        }
    return attr
