import networkx as nx
import plotly.graph_objects as go
import numpy as np
import streamlit as st


@st.cache_data(show_spinner=False)
def _cached_layout(key: tuple, seed: int = 42) -> dict:
    """Force-directed layout, cached per node/edge set.

    `key` is a hashable (nodes, edges) tuple so the cache stays per-filter.
    Fails open to plain execution when run outside the Streamlit runtime
    (e.g. pytest). Layout is deterministic because seed=42, so it computes
    once per filter and is reused on every subsequent rerun.
    """
    nodes, edges = key
    sub = nx.Graph()
    sub.add_nodes_from(nodes)
    sub.add_edges_from(edges)
    return nx.spring_layout(sub, seed=seed, k=2.0 / np.sqrt(max(len(nodes), 1)))


def _graph_key(G: nx.Graph):
    return (
        tuple(sorted(G.nodes())),
        tuple(sorted(tuple(sorted(e)) for e in G.edges())),
    )


def create_network_figure(
    G: nx.Graph,
    degree_cent: dict,
    betweenness_cent: dict,
    node_colors: dict | None = None,
    title: str = "Contact Network",
    top_n: int | None = None,
) -> go.Figure:
    nodes = list(G.nodes())
    if top_n and len(nodes) > top_n:
        top_nodes = sorted(degree_cent.keys(), key=lambda x: degree_cent.get(x, 0), reverse=True)[:top_n]
        sub_nodes = set(top_nodes)
        G_sub = G.subgraph(sub_nodes).copy()
    else:
        G_sub = G
        top_n = len(G_sub.nodes())

    pos = _cached_layout(_graph_key(G_sub))

    edge_x, edge_y = [], []
    for edge in G_sub.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    edge_trace = go.Scatter(x=edge_x, y=edge_y, mode="lines",
                            line=dict(width=0.5, color="#3d494c"), hoverinfo="none")

    node_x = [pos[n][0] for n in G_sub.nodes()]
    node_y = [pos[n][1] for n in G_sub.nodes()]
    node_sizes = [max(8, degree_cent.get(n, 0) * 80) for n in G_sub.nodes()]
    node_text = [f"{n}<br>Deg: {degree_cent.get(n, 0):.3f}<br>Btw: {betweenness_cent.get(n, 0):.3f}"
                 for n in G_sub.nodes()]

    colors = []
    for n in G_sub.nodes():
        if node_colors and n in node_colors:
            colors.append(node_colors[n])
        else:
            bc = betweenness_cent.get(n, 0)
            colors.append(bc)

    node_trace = go.Scatter(
        x=node_x, y=node_y, mode="markers+text",
        text=list(G_sub.nodes()), textposition="top center", textfont=dict(size=8),
        hovertext=node_text, hoverinfo="text",
        marker=dict(size=node_sizes, color=colors, colorscale="Viridis",
                    colorbar=dict(title="Betweenness"), line=dict(width=1, color="#dde2f8")),
    )

    fig = go.Figure(data=[edge_trace, node_trace])
    fig.update_layout(
        title=dict(text=f"{title} — {len(G_sub.nodes()):,} nodes / {len(G_sub.edges()):,} edges",
                   font=dict(size=16)),
        showlegend=False, hovermode="closest",
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        plot_bgcolor="#080e1d", paper_bgcolor="#0d1322",
        font=dict(color="#dde2f8"),
        margin=dict(l=20, r=20, t=40, b=20),
        height=500,
    )
    return fig


def create_bipartite_figure(
    visits_df, location_id, people_df, top_n_people: int = 12,
) -> go.Figure:
    import pandas as pd
    loc_visits = visits_df[visits_df["Location_ID"] == location_id]
    case_ids = set(people_df[people_df["Infection_Status"] == "Confirmed"]["Person_ID"])

    visitors = loc_visits["Person_ID"].unique()[:top_n_people]
    colors_map = {"case": "#f43f5e", "normal": "#4cd7f6"}

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=[0.5], y=[0.5], mode="markers+text",
        text=[location_id], textposition="middle center",
        marker=dict(size=50, color="#06b6d4", line=dict(width=2, color="#4cd7f6")),
        textfont=dict(color="#080e1d", size=12, family="JetBrains Mono"),
    ))

    n = len(visitors)
    for i, person in enumerate(visitors):
        y_pos = 0.1 + 0.8 * i / max(n - 1, 1)
        is_case = person in case_ids
        color = colors_map["case"] if is_case else colors_map["normal"]
        fig.add_trace(go.Scatter(
            x=[0.05], y=[y_pos], mode="markers+text",
            text=[person], textposition="middle right",
            marker=dict(size=20, color=color, line=dict(width=1, color=color)),
            textfont=dict(color=color, size=9, family="JetBrains Mono"),
        ))
        fig.add_shape(type="line", x0=0.08, y0=y_pos, x1=0.45, y1=0.5,
                      line=dict(color=color, width=1, dash="dot"))

    fig.update_layout(
        title=f"Bipartite: {location_id}", showlegend=False,
        xaxis=dict(visible=False), yaxis=dict(visible=False),
        plot_bgcolor="#080e1d", paper_bgcolor="#0d1322",
        font=dict(color="#dde2f8"), height=350,
        margin=dict(l=10, r=10, t=40, b=10),
    )
    return fig
