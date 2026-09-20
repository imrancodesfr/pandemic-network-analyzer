import networkx as nx
import pandas as pd


def build_location_graph(visits_df: pd.DataFrame) -> nx.Graph:
    G = nx.Graph()
    person_nodes = visits_df["Person_ID"].unique()
    location_nodes = visits_df["Location_ID"].unique()
    G.add_nodes_from(person_nodes, bipartite=0)
    G.add_nodes_from(location_nodes, bipartite=1)
    edges = visits_df.groupby(["Person_ID", "Location_ID"]).size().reset_index(name="visits")
    for _, row in edges.iterrows():
        G.add_edge(row["Person_ID"], row["Location_ID"], weight=row["visits"])
    return G


def get_person_location_edges(visits_df: pd.DataFrame) -> list[tuple]:
    return list(zip(visits_df["Person_ID"], visits_df["Location_ID"]))
