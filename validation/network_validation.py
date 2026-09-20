import networkx as nx
from typing import Any
from utils.helpers import pass_result, warning_result


def validate_contact_graph(G: nx.Graph) -> dict[str, Any]:
    n_nodes = G.number_of_nodes()
    n_edges = G.number_of_edges()
    components = list(nx.connected_components(G))
    n_components = len(components)
    giant_size = max(len(c) for c in components) if components else 0
    isolated = [n for n in G.nodes() if G.degree(n) == 0]
    density = nx.density(G) if n_nodes > 1 else 0
    self_loops = nx.number_of_selfloops(G)

    warnings = []
    if n_edges < 10:
        warnings.append(warning_result("INSUFFICIENT_EDGES", f"Only {n_edges} contacts recorded.", n_edges))
    if n_nodes < 10:
        warnings.append(warning_result("INSUFFICIENT_NODES", f"Only {n_nodes} people in network.", n_nodes))

    return {
        "total_people": n_nodes,
        "total_edges": n_edges,
        "connected_components": n_components,
        "giant_component_size": giant_size,
        "giant_component_pct": giant_size / n_nodes if n_nodes > 0 else 0,
        "isolated_nodes": len(isolated),
        "isolated_list": isolated[:20],
        "density": density,
        "self_loops": self_loops,
        "warnings": warnings,
        "reliable": n_edges >= 10 and n_nodes >= 10,
    }
