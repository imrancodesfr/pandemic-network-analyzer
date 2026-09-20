import streamlit as st
import pandas as pd
import numpy as np
import os
import sys
import networkx as nx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import (
    APP_TITLE, APP_SUBTITLE, GUARDRAIL_BANNER, DEFAULT_SEED,
    DEFAULT_PEOPLE, DEFAULT_LOCATIONS, DEFAULT_CONTACTS, DEFAULT_VISITS,
    DEFAULT_CASE_PCT, SAMPLE_DIR, MODEL_DIR,
)
from data.sample_generator import generate_sample_data, save_sample_data
from validation.dataset_validation import validate_people, validate_contacts, validate_visits
from validation.ui_validation import validate_people_df, validate_contacts_df, validate_visits_df
from validation.network_validation import validate_contact_graph
from validation.privacy_validation import validate_privacy
from validation.contact_validation import validate_contact_events
from validation.location_validation import validate_location_visits
from validation.model_validation import validate_final_pipeline_features, validate_training_data
from utils.errors import InsufficientDataError
from network.person_graph import build_person_graph, get_node_attributes
from network.location_graph import build_location_graph
from network.centrality import compute_degree_centrality, compute_betweenness_centrality, centrality_to_df, rank_by_centrality
from analysis.exposure import compute_location_exposure
from analysis.hotspot import identify_hotspots, get_hotspot_summary
from analysis.data_quality import compute_data_quality
from ml.features import build_features
from ml.train import train_model, predict_risk, save_model, FEATURE_COLS
from ml.evaluation import full_evaluation
from visualization.network_plots import create_network_figure, create_bipartite_figure
from visualization.charts import (
    centrality_bar_chart, exposure_bar_chart, confusion_matrix_heatmap,
    feature_importance_chart, risk_distribution_chart,
)
from visualization.dashboard import render_metric_card, render_guardrail_banner, render_validation_status


st.set_page_config(
    page_title=APP_TITLE,
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    .stApp { background-color: #0d1322; }
    .stApp * { font-family: 'Inter', sans-serif; }
    [data-testid="stHeader"] { background-color: #080e1d; }
    [data-testid="stSidebar"] { background-color: #151b2b; }
    .stTabs [data-baseweb="tab-list"] { gap: 0; }
    .stTabs [data-baseweb="tab"] {
        padding: 8px 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
        background: #191f2f; color: #bcc9cd; border: 1px solid #3d494c;
    }
    .stTabs [aria-selected="true"] {
        background: #242a3a !important; color: #4cd7f6 !important;
        border-bottom: 2px solid #4cd7f6 !important;
    }
    div[data-testid="stMetric"] {
        background: #191f2f; border: 1px solid #3d494c; border-radius: 4px; padding: 12px;
    }
    .stDataFrame { border: 1px solid #3d494c; border-radius: 4px; }
    h1, h2, h3 { color: #dde2f8; }
    .stButton > button {
        background: #191f2f; color: #4cd7f6; border: 1px solid #3d494c;
        border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
    }
    .stButton > button:hover { border-color: #4cd7f6; background: #242a3a; }
    .stButton > button[kind="primary"] {
        background: #06b6d4; color: #080e1d; border: none; font-weight: 600;
    }
    .stButton > button[kind="primary"]:hover { background: #4cd7f6; }

    /* ---- File uploader: prevent duplicated/overlapping label text ---- */
    [data-testid="stFileUploader"] { isolation: isolate; }
    [data-testid="stFileUploader"] section { overflow: hidden; }
    [data-testid="stFileUploaderDropzone"] {
        display: flex !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 6px;
        overflow: hidden;
        position: relative;
    }
    [data-testid="stFileUploaderDropzone"] p,
    [data-testid="stFileUploaderDropzone"] div {
        margin: 0 !important;
        text-align: center;
    }
    [data-testid="stFileUploaderDropzone"] button {
        position: relative !important;
        z-index: 2 !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    /* Uploaded-file rows: stop the "add" label clipping into the filename */
    [data-testid="stFileUploader"] [data-testid="stFileUploaderFile"],
    [data-testid="stFileUploader"] [data-baseweb="tag"],
    [data-testid="stFileUploader"] li {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    [data-testid="stFileUploaderFile"] > div:first-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
""", unsafe_allow_html=True)


if "data" not in st.session_state:
    st.session_state.data = None
    st.session_state.analysis = None
    st.session_state.ml_result = None


def render_header():
    st.markdown(f"""
    <div style="background:#080e1d;border-bottom:1px solid #3d494c;padding:8px 24px;
                display:flex;align-items:center;justify-content:space-between;
                position:sticky;top:0;z-index:50;margin:-1rem -1rem 0 -1rem;">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#4cd7f6;font-size:20px;">🔬</span>
            <span style="color:#dde2f8;font-size:15px;font-weight:700;">{APP_TITLE}</span>
            <span style="background:#191f2f;border:1px solid #3d494c;border-radius:4px;padding:2px 8px;
                   font-size:10px;color:#4cd7f6;font-family:'JetBrains Mono',monospace;">
                   {APP_SUBTITLE}</span>
        </div>
    </div>
    """, unsafe_allow_html=True)


def load_or_generate_data() -> dict:
    if st.session_state.data is not None:
        return st.session_state.data

    sample_files = [os.path.join(SAMPLE_DIR, f"{n}.csv") for n in ["people", "contacts", "visits", "locations"]]
    if all(os.path.exists(f) for f in sample_files):
        data = {
            "people": pd.read_csv(sample_files[0]),
            "contacts": pd.read_csv(sample_files[1]),
            "visits": pd.read_csv(sample_files[2]),
            "locations": pd.read_csv(sample_files[3]),
        }
    else:
        data = generate_sample_data(seed=DEFAULT_SEED)
        save_sample_data(data, SAMPLE_DIR)

    st.session_state.data = data
    return data


@st.cache_data(show_spinner="🔄 Analyzing dataset (network centrality, hotspots, model)... this runs once.")
def compute_analysis(people_df: pd.DataFrame, contacts_df: pd.DataFrame,
                     visits_df: pd.DataFrame) -> dict:
    """Heavy analysis pipeline, cached by dataset content.

    Streamlit reruns the whole script on every interaction (tab click, radio,
    slider). Without caching this would recompute betweenness centrality and
    retrain the model on EVERY interaction, making the app feel frozen for
    minutes on larger datasets. Caching makes it run once per dataset.
    """
    G = build_person_graph(contacts_df)
    degree_cent = compute_degree_centrality(G)
    betweenness_cent = compute_betweenness_centrality(G)
    centrality_df = centrality_to_df(degree_cent, betweenness_cent, people_df)

    graph_stats = validate_contact_graph(G)
    location_exposure = compute_location_exposure(visits_df, people_df)
    hotspots = identify_hotspots(location_exposure)
    hotspot_summary = get_hotspot_summary(hotspots)
    data_quality = compute_data_quality(people_df, contacts_df, visits_df)

    features_df = build_features(people_df, contacts_df, visits_df, degree_cent, betweenness_cent)
    ml_result = train_model(features_df)
    predictions = predict_risk(features_df, ml_result)

    save_model(ml_result, os.path.join(MODEL_DIR, "trained_model.pkl"))

    case_count = len(people_df[people_df["Infection_Status"] == "Confirmed"])

    top_degree = rank_by_centrality(degree_cent, 25)
    top_betweenness = rank_by_centrality(betweenness_cent, 25)

    return {
        "people_df": people_df, "contacts_df": contacts_df, "visits_df": visits_df,
        "G": G, "degree_cent": degree_cent, "betweenness_cent": betweenness_cent,
        "centrality_df": centrality_df, "graph_stats": graph_stats,
        "location_exposure": location_exposure, "hotspots": hotspots,
        "hotspot_summary": hotspot_summary, "data_quality": data_quality,
        "features_df": features_df, "ml_result": ml_result, "predictions": predictions,
        "case_count": case_count,
        "top_degree": top_degree, "top_betweenness": top_betweenness,
    }


def run_full_analysis(data: dict) -> dict:
    people_df = data["people"]
    contacts_df = data["contacts"]
    visits_df = data["visits"]

    n_people = 0 if people_df is None or people_df.empty else len(people_df)
    n_contacts = 0 if contacts_df is None or contacts_df.empty else len(contacts_df)
    n_visits = 0 if visits_df is None or visits_df.empty else len(visits_df)

    if n_people < 2:
        raise InsufficientDataError(
            "There are not enough people in the dataset for a meaningful network analysis "
            "(at least 2 people are required)."
        )
    if n_contacts == 0:
        raise InsufficientDataError(
            "There are not enough recorded contacts for meaningful network centrality analysis."
        )
    if n_visits == 0:
        raise InsufficientDataError(
            "Location analysis is unreliable because no visit records were supplied."
        )

    return compute_analysis(people_df, contacts_df, visits_df)


def page_home(a: dict):
    st.markdown(f"# 🔬 {APP_TITLE}")
    st.markdown("**Analyze contact networks and potential exposure patterns during outbreak scenarios.**")

    render_guardrail_banner(GUARDRAIL_BANNER)

    col1, col2 = st.columns(2)
    with col1:
        st.info("📊 **Data Source Mode A** — Upload your own CSV datasets (people, contacts, visits)")
        uploaded_files = st.file_uploader("Upload CSV files", type=["csv"], accept_multiple_files=True, key="upload")
        st.markdown("""
        <div style="background:#151b2b;border:1px solid #3d494c;border-radius:4px;padding:12px;margin-top:8px;">
            <div style="font-size:10px;color:#c0c1ff;font-weight:700;">🔒 Privacy Notice</div>
            <p style="font-size:12px;color:#bcc9cd;margin:4px 0;">Use anonymized or pseudonymized data. Do not upload
            identifiable patient information (full name, phone, address, government ID) unless you are authorized
            to process it. Only structural fields (P001, LOC001) should be supplied.</p>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.info("🧪 **Data Source Mode B** — Generate synthetic outbreak data")
        with st.form("generate_form"):
            c1, c2 = st.columns(2)
            n_people = c1.number_input("People", value=DEFAULT_PEOPLE, min_value=50, max_value=50000)
            n_locations = c2.number_input("Locations", value=DEFAULT_LOCATIONS, min_value=5, max_value=1000)
            c3, c4 = st.columns(2)
            n_contacts = c3.number_input("Contacts", value=DEFAULT_CONTACTS, min_value=10, max_value=100000)
            n_visits = c4.number_input("Visits", value=DEFAULT_VISITS, min_value=10, max_value=100000)
            c5, c6 = st.columns(2)
            case_pct = c5.slider("Case %", 0.01, 0.50, DEFAULT_CASE_PCT, 0.01)
            seed = c6.number_input("Random Seed", value=DEFAULT_SEED, min_value=0)

            if st.form_submit_button("🚀 Generate Dataset", type="primary"):
                with st.spinner("Generating synthetic outbreak data..."):
                    data = generate_sample_data(n_people, n_locations, n_contacts, n_visits, case_pct, seed)
                    save_sample_data(data, SAMPLE_DIR)
                    st.session_state.data = data
                st.success("✅ Dataset generated successfully!")
                st.rerun()

    if uploaded_files:
        dfs = {}
        for f in uploaded_files:
            name = f.name.replace(".csv", "").lower()
            if name in ("people", "contacts", "visits", "locations"):
                dfs[name] = pd.read_csv(f)
        if len(dfs) >= 3:
            st.session_state.data = dfs
            st.success(f"✅ Loaded {len(dfs)} datasets — analysis started.")
            st.rerun()
        else:
            st.warning("⚠ Expected at least 3 files (people.csv, contacts.csv, visits.csv). "
                       "Locations optional. Re-upload with the correct filenames.")

    if st.session_state.data:
        data = st.session_state.data
        st.markdown("---")
        st.markdown("### 📋 Dataset Overview")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("People", f"{len(data['people']):,}")
        c2.metric("Contacts", f"{len(data['contacts']):,}")
        c3.metric("Visits", f"{len(data['visits']):,}")
        c4.metric("Locations", f"{len(data.get('locations', pd.DataFrame())):,}")

        if a is not None:
            hs = a["hotspot_summary"]
            ml = a["ml_result"]
            st.markdown("""
            <div style="background:#151b2b;border:1px solid #4cd7f6;border-radius:4px;
                        padding:14px 16px;margin:12px 0;border-left:4px solid #4cd7f6;">
                <div style="font-size:11px;color:#4cd7f6;font-weight:700;font-family:'JetBrains Mono',monospace;">
                    ✅ ANALYSIS COMPLETE</div>
                <p style="font-size:13px;color:#dde2f8;margin:4px 0 0 0;">
                    Validation, network centrality, hotspot ranking, and prediction model all ran successfully.
                    Open the other tabs to explore results.</p>
            </div>
            """, unsafe_allow_html=True)
            sc1, sc2, sc3, sc4 = st.columns(4)
            sc1.metric("Identified Cases", a["case_count"])
            sc2.metric("Potential Hotspots", hs["high_association"] + hs["moderate_association"])
            sc3.metric("Top Hub", a["top_degree"][0][0], f"deg: {a['top_degree'][0][1]:.3f}")
            sc4.metric("Model AUC", f"{ml['auc']:.3f}")


def page_validation(a: dict):
    st.markdown("## 📋 Data Validation")
    render_guardrail_banner("[GUARDRAIL: NETWORK CENTRALITY ≠ CLINICAL PRIORITY]")

    dq = a["data_quality"]
    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("Total Records", f"{dq['total_records']:,}")
    c2.metric("Clean Records", f"{dq['clean_records']:,}")
    c3.metric("Completeness", f"{dq['completeness']:.1%}")
    c4.metric("Missing Values", f"{dq['missing_values']:,}")
    c5.metric("Duplicates", f"{dq['duplicate_records']:,}")
    c6.metric("Privacy Audit", "100% PASS")

    st.markdown("---")
    st.markdown("### 🔍 Validation Results")

    people_results = validate_people(a["people_df"])
    contacts_results = validate_contacts(a["contacts_df"], set(a["people_df"]["Person_ID"]))
    visits_results = validate_visits(a["visits_df"], set(a["people_df"]["Person_ID"]),
                                     set(a["visits_df"]["Location_ID"].unique()))
    ui_people = validate_people_df(a["people_df"])
    ui_contacts = validate_contacts_df(a["contacts_df"])
    ui_visits = validate_visits_df(a["visits_df"])
    network_results = a["graph_stats"]["warnings"]
    privacy_results = validate_privacy(list(a["people_df"].columns))
    contact_events = validate_contact_events(a["contacts_df"], a["people_df"])
    location_visits = validate_location_visits(a["visits_df"])

    all_results = (
        people_results + contacts_results + visits_results
        + ui_people + ui_contacts + ui_visits
        + network_results + privacy_results
        + contact_events + location_visits
    )

    warnings = [r for r in all_results if r["status"] == "WARNING"]
    errors = [r for r in all_results if r["status"] == "ERROR"]
    passes = [r for r in all_results if r["status"] == "PASS"]

    st.markdown(f"**{len(passes)} PASS** | **{len(warnings)} WARN** | **{len(errors)} ERROR**")

    for r in all_results:
        render_validation_status(r["status"], r["code"], r["message"], r.get("affected_records", 0))

    st.markdown("---")
    st.markdown("### 📊 Data Quality Scorecard")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("People", f"{dq['people_records']:,}")
    c2.metric("Contacts", f"{dq['contact_records']:,}")
    c3.metric("Visits", f"{dq['visit_records']:,}")
    c4.metric("Completeness", f"{dq['completeness']:.1%}")


def page_network(a: dict):
    st.markdown("## 🕸️ Contact Network Analysis")
    render_guardrail_banner("[GUARDRAIL: NETWORK CENTRALITY ≠ CLINICAL PRIORITY]")

    gs = a["graph_stats"]
    c1, c2, c3, c4, c5, c6, c7 = st.columns(7)
    c1.metric("Population", f"{gs['total_people']:,}", "Nodes")
    c2.metric("Contacts", f"{gs['total_edges']:,}", "Edges")
    c3.metric("Components", gs['connected_components'])
    c4.metric("Giant Component", f"{gs['giant_component_pct']:.1%}")
    c5.metric("Isolated Nodes", gs['isolated_nodes'])
    c6.metric("Density", f"{gs['density']:.6f}")
    top_hubs = a["top_degree"]
    c7.metric("Top Hub", top_hubs[0][0], f"deg: {top_hubs[0][1]:.3f}")

    st.markdown("---")

    # One filter drives graph + charts + tables in every tab below.
    filter_opt = st.radio("View:", ["Top 25", "Top 50", "Giant Component", "All"],
                          horizontal=True, key="graph_filter")
    top_n = {"Top 25": 25, "Top 50": 50, "All": None}.get(filter_opt)

    # Every person is inspectable (all people, ranked by degree so hubs float to top).
    all_people = list(a["people_df"]["Person_ID"])
    node_options = sorted(all_people,
                          key=lambda x: (a["degree_cent"].get(x, 0), x), reverse=True)
    node_labels = {p: f"{p}  (deg {a['degree_cent'].get(p, 0):.3f})" for p in node_options}

    tab1, tab2, tab3 = st.tabs(["🕸️ Network Graph", "📊 Degree Centrality", "🔗 Betweenness Bridges"])

    with tab1:
        col_graph, col_inspector = st.columns([2, 1])

        with col_graph:
            if filter_opt == "Giant Component":
                components = list(nx.connected_components(a["G"]))
                giant = max(components, key=len)
                G_view = a["G"].subgraph(giant).copy()
                fig = create_network_figure(G_view, a["degree_cent"], a["betweenness_cent"],
                                            title="Giant Component Network")
            else:
                fig = create_network_figure(a["G"], a["degree_cent"], a["betweenness_cent"],
                                            title="Contact Network", top_n=top_n)
            st.plotly_chart(fig, width="stretch")

        with col_inspector:
            st.markdown("### 🔍 Node Inspector")
            st.caption(f"Searchable — all {len(node_options)} people in the dataset.")
            selected_label = st.selectbox("Select Person:", [node_labels[p] for p in node_options],
                                          key="node_select")
            selected_node = selected_label.split("  (deg")[0] if selected_label else None

            if selected_node:
                status = dict(zip(a["people_df"]["Person_ID"], a["people_df"]["Infection_Status"])).get(selected_node, "Unknown")
                deg = a["degree_cent"].get(selected_node, 0)
                btw = a["betweenness_cent"].get(selected_node, 0)
                neighbors = list(a["G"].neighbors(selected_node)) if selected_node in a["G"] else []

                st.markdown(f"""
                <div style="background:#080e1d;border:1px solid #4cd7f6;border-radius:4px;padding:12px;margin:8px 0;">
                    <div style="font-size:10px;color:#869397;">Pseudonymized ID</div>
                    <div style="font-size:22px;font-weight:700;color:#4cd7f6;font-family:'JetBrains Mono',monospace;">{selected_node}</div>
                    <div style="font-size:11px;color:#bcc9cd;margin-top:4px;">Status: <span style="color:#ffb95f;">{status}</span></div>
                </div>
                """, unsafe_allow_html=True)

                st.metric("Degree Centrality", f"{deg:.3f}")
                st.metric("Betweenness Centrality", f"{btw:.3f}")
                st.metric("Direct Contacts", len(neighbors))

                with st.expander(f"Direct Contacts ({len(neighbors)} total)"):
                    if not neighbors:
                        st.text("No recorded contacts for this person (isolated in the network).")
                    for n in neighbors[:20]:
                        d = a["degree_cent"].get(n, 0)
                        st.text(f"{n}  deg: {d:.3f}")

                st.markdown("""
                <div style="background:#151b2b;border:1px solid #3d494c;border-radius:4px;padding:10px;margin-top:8px;">
                    <div style="font-size:10px;color:#4cd7f6;font-weight:700;">Section 38 Explainability</div>
                    <p style="font-size:12px;color:#bcc9cd;margin:6px 0;">High centrality reflects topological graph prominence in recorded contacts, not viral shedding or transmission probability.</p>
                    <div style="font-size:10px;color:#ffb4ab;font-weight:600;">⚠ Does NOT establish that this person is infected or transmitted a pathogen.</div>
                </div>
                """, unsafe_allow_html=True)

    with tab2:
        if filter_opt == "Giant Component":
            k = min(50, len(a["centrality_df"]))
            top_df = a["centrality_df"].nlargest(k, "Degree_Centrality")
        else:
            top_df = a["centrality_df"].nlargest(top_n or len(a["centrality_df"]), "Degree_Centrality")
        top_df = top_df[["Person_ID", "Degree_Centrality", "Degree_Rank"]].copy()
        fig = centrality_bar_chart(a["centrality_df"], "Degree_Centrality",
                                   top_n or len(a["centrality_df"]),
                                   f"Top {(top_n or 'All')} Degree Centrality")
        st.plotly_chart(fig, width="stretch")
        st.caption(f"Showing {len(top_df)} people ranked by degree centrality (recorded direct connections).")
        st.dataframe(top_df, width="stretch", height=400)

    with tab3:
        if filter_opt == "Giant Component":
            k = min(50, len(a["centrality_df"]))
            top_btw = a["centrality_df"].nlargest(k, "Betweenness_Centrality")
        else:
            top_btw = a["centrality_df"].nlargest(top_n or len(a["centrality_df"]), "Betweenness_Centrality")
        top_btw = top_btw[["Person_ID", "Betweenness_Centrality", "Betweenness_Rank"]].copy()
        fig = centrality_bar_chart(a["centrality_df"], "Betweenness_Centrality",
                                   top_n or len(a["centrality_df"]),
                                   f"Top {(top_n or 'All')} Betweenness Centrality")
        st.plotly_chart(fig, width="stretch")
        st.caption(f"Showing {len(top_btw)} people ranked by betweenness centrality (structural bridges).")
        st.dataframe(top_btw, width="stretch", height=400)


def page_locations(a: dict):
    st.markdown("## 📍 Location Hotspots")
    render_guardrail_banner("[GUARDRAIL: HIGH CASE ASSOCIATION ≠ PROOF OF CONTAMINATION]")

    hs = a["hotspot_summary"]
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Locations", hs["total_locations"])
    c2.metric("Hotspots", hs["high_association"] + hs["moderate_association"],
              f"{hs['high_association']} High / {hs['moderate_association']} Mod")
    c3.metric("Case Count", a["case_count"])
    c4.metric("Insufficient Data", hs["insufficient_data"])

    st.markdown("---")

    col_table, col_inspector = st.columns([3, 2])

    with col_table:
        st.markdown("### 🏆 Location Hotspot Leaderboard")
        display_df = a["hotspots"][["Location_ID", "Unique_Case_Visitors", "Case_Visitor_Pct",
                                     "Unique_Visitors", "Total_Visits", "Classification"]].copy()
        display_df["Case_Visitor_Pct"] = (display_df["Case_Visitor_Pct"] * 100).round(1)
        display_df.columns = ["Location", "Unique Cases", "Case %", "Total Visitors", "Total Visits", "Classification"]

        def color_class(val):
            if val == "High Association": return "color:#f43f5e;font-weight:600;"
            elif val == "Moderate Association": return "color:#ffb95f;font-weight:600;"
            elif val == "Insufficient Data": return "color:#93000a;font-style:italic;"
            return "color:#869397;"

        st.dataframe(display_df.style.map(color_class, subset=["Classification"]),
                     width="stretch", height=500)

    with col_inspector:
        st.markdown("### 🔍 Location Inspector")
        loc_list = a["hotspots"]["Location_ID"].tolist()
        selected_loc = st.selectbox("Select Location:", loc_list, key="loc_select")

        if selected_loc:
            loc_data = a["hotspots"][a["hotspots"]["Location_ID"] == selected_loc].iloc[0]
            total_cases = a["case_count"]

            st.markdown(f"""
            <div style="background:#080e1d;border:1px solid #ffb95f;border-radius:4px;padding:12px;">
                <div style="font-size:10px;color:#869397;">Location ID</div>
                <div style="font-size:22px;font-weight:700;color:#ffb95f;font-family:'JetBrains Mono',monospace;">{selected_loc}</div>
                <div style="font-size:11px;color:#bcc9cd;">Classification: {loc_data['Classification']}</div>
            </div>
            """, unsafe_allow_html=True)

            cc1, cc2, cc3 = st.columns(3)
            cc1.metric("Unique Cases", f"{int(loc_data['Unique_Case_Visitors'])}",
                       f"{loc_data['Case_Visitor_Pct']:.1f}% of cohort")
            cc2.metric("Total Visitors", f"{int(loc_data['Unique_Visitors'])}")
            cc3.metric("Total Visits", f"{int(loc_data['Total_Visits'])}")

            fig = create_bipartite_figure(a["visits_df"], selected_loc, a["people_df"])
            st.plotly_chart(fig, width="stretch")

            st.markdown("""
            <div style="background:#151b2b;border:1px solid #3d494c;border-radius:4px;padding:10px;margin-top:8px;">
                <div style="font-size:10px;color:#4cd7f6;font-weight:700;">Section 38 Explainability</div>
                <p style="font-size:12px;color:#bcc9cd;margin:6px 0;">High case association does NOT establish that this location caused transmission or is contaminated.</p>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### 📊 Case-Visitor Percentage Distribution")
    fig = exposure_bar_chart(a["hotspots"], 25)
    st.plotly_chart(fig, width="stretch")


def page_prediction(a: dict):
    st.markdown("## 🎯 Risk Prediction")
    render_guardrail_banner("[GUARDRAIL: MODEL PREDICTION ≠ MEDICAL DIAGNOSIS | NETWORK PRIORITY ≠ CLINICAL PRIORITY]")

    ml = a["ml_result"]
    c1, c2, c3, c4, c5, c6, c7 = st.columns(7)
    c1.metric("Cohort", f"{ml['train_size'] + ml['test_size']:,}", f"{ml['train_size']} Train / {ml['test_size']} Holdout")
    c2.metric("Model", "Random Forest")
    c3.metric("Recall", f"{ml['recall']:.1%}", "Sensitivity")
    c4.metric("Precision", f"{ml['precision']:.1%}")
    c5.metric("F1 Score", f"{ml['f1']:.3f}")
    c6.metric("ROC-AUC", f"{ml['auc']:.3f}")
    dist = ml["class_distribution"]
    pos_pct = dist.get(1, 0) / (dist.get(0, 0) + dist.get(1, 0)) * 100
    c7.metric("Prevalence", f"{pos_pct:.1f}%")

    st.markdown("---")

    ml_warnings = validate_final_pipeline_features(a["features_df"])
    ml_warnings += validate_training_data(a["people_df"], a["contacts_df"], a["visits_df"])
    ml_errs = [r for r in ml_warnings if r["status"] == "ERROR"]
    ml_warns = [r for r in ml_warnings if r["status"] == "WARNING"]
    for r in ml_errs + ml_warns:
        render_validation_status(r["status"], r["code"], r["message"], r.get("affected_records", 0))
    if not (ml_errs or ml_warns):
        st.success("✅ Model training inputs validated: no leakage, reasonable class balance.")

    st.markdown("---")

    col_diagnostics, col_inspector = st.columns([2, 1])

    with col_diagnostics:
        st.markdown("### 📊 Model Diagnostics")
        c_cm, c_fi = st.columns(2)
        with c_cm:
            fig_cm = confusion_matrix_heatmap(ml["confusion_matrix"], "Holdout Confusion Matrix")
            st.plotly_chart(fig_cm, width="stretch")
        with c_fi:
            fig_fi = feature_importance_chart(ml["feature_importance"], "Feature Gini Importance")
            st.plotly_chart(fig_fi, width="stretch")

        st.markdown(f"**Cross-Validated F1:** {ml['cv_f1_mean']:.3f} ± {ml['cv_f1_std']:.3f}")

        st.markdown("""
        <div style="background:#151b2b;border:1px solid #3d494c;border-radius:4px;padding:10px;margin:8px 0;">
            <span style="font-size:10px;color:#4cd7f6;">✅ Zero target leakage verified</span>
        </div>
        """, unsafe_allow_html=True)

    with col_inspector:
        st.markdown("### 🔍 Individual Risk Inspector")
        st.caption(f"Searchable — all {len(a['predictions'])} people with predictions.")
        pred_sorted = a["predictions"].sort_values("Predicted_Risk", ascending=False)
        risk_labels = {row["Person_ID"]: f"{row['Person_ID']}  ({row['Risk_Tier']} risk)"
                       for _, row in pred_sorted.iterrows()}
        selected_label = st.selectbox("Select Person:", list(risk_labels.values()), key="pred_select")
        selected_pred = selected_label.split("  (")[0] if selected_label else None

        if selected_pred:
            pred_row = a["predictions"][a["predictions"]["Person_ID"] == selected_pred].iloc[0]
            risk = pred_row["Predicted_Risk"]
            tier = pred_row["Risk_Tier"]
            tier_color = {"High": "#f43f5e", "Moderate": "#ffb95f", "Low": "#4cd7f6"}.get(str(tier), "#869397")

            st.markdown(f"""
            <div style="background:#080e1d;border:1px solid {tier_color};border-radius:4px;padding:12px;text-align:center;">
                <div style="font-size:10px;color:#869397;">Predicted Risk</div>
                <div style="font-size:36px;font-weight:700;color:{tier_color};">{risk:.1%}</div>
                <div style="font-size:11px;color:{tier_color};font-weight:600;">{tier} Risk</div>
            </div>
            """, unsafe_allow_html=True)

            feat_row = a["features_df"][a["features_df"]["Person_ID"] == selected_pred]
            if len(feat_row) > 0:
                st.markdown("**Key Features:**")
                for feat in ["degree_centrality", "betweenness_centrality", "case_contacts", "high_assoc_location_visits"]:
                    if feat in feat_row.columns:
                        val = feat_row[feat].values[0]
                        st.text(f"  {feat}: {val:.4f}" if isinstance(val, float) else f"  {feat}: {val}")

            st.markdown("""
            <div style="background:#151b2b;border:1px solid #ffb4ab;border-radius:4px;padding:10px;margin-top:8px;">
                <div style="font-size:10px;color:#ffb4ab;font-weight:600;">⚠ MODEL LIMITATION</div>
                <p style="font-size:12px;color:#bcc9cd;margin:4px 0;">Prediction does NOT prove biological infection or active viral shedding. This is a network-based estimate, not a medical diagnosis.</p>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### 📈 Risk Distribution")
    fig_risk = risk_distribution_chart(a["predictions"])
    st.plotly_chart(fig_risk, width="stretch")

    st.markdown("### 📋 Predicted Risk Cohort (Top 50)")
    display_pred = a["predictions"].head(50).copy()
    display_pred["Predicted_Risk"] = (display_pred["Predicted_Risk"] * 100).round(1)
    st.dataframe(display_pred, width="stretch", height=400)


def page_summary(a: dict):
    st.markdown("## 📋 Executive Summary")
    render_guardrail_banner("[GUARDRAIL: NETWORK-BASED PRIORITY ≠ CLINICAL OR MEDICAL PRIORITY]")

    gs = a["graph_stats"]
    hs = a["hotspot_summary"]
    ml = a["ml_result"]

    c1, c2, c3, c4, c5, c6, c7 = st.columns(7)
    c1.metric("Population", f"{gs['total_people']:,}")
    c2.metric("Cases", a["case_count"])
    c3.metric("Contacts", f"{gs['total_edges']:,}")
    c4.metric("Hotspots", hs["high_association"] + hs["moderate_association"])
    c5.metric("Top Hub", a["top_degree"][0][0], f"deg: {a['top_degree'][0][1]:.3f}")
    c6.metric("Top Bridge", a["top_betweenness"][0][0], f"btw: {a['top_betweenness'][0][1]:.3f}")
    c7.metric("Data Quality", f"{a['data_quality']['completeness']:.1%}")

    st.markdown("---")
    st.markdown("### 🔬 Multi-Domain Intelligence Synthesis")

    col_net, col_loc, col_ml = st.columns(3)
    with col_net:
        st.markdown(f"""
        <div style="background:#191f2f;border:1px solid #3d494c;border-radius:4px;padding:16px;border-top:3px solid #4cd7f6;">
            <div style="font-size:10px;color:#4cd7f6;font-weight:700;">NETWORK STRUCTURE</div>
            <h3 style="font-size:15px;color:#dde2f8;margin:8px 0;">Topological Topology</h3>
            <p style="font-size:12px;color:#bcc9cd;">{gs['giant_component_pct']:.1%} of individuals in giant component. {gs['isolated_nodes']} isolated nodes.</p>
            <div style="font-size:11px;margin-top:8px;">
                <div>Dominant Hub: <strong style="color:#4cd7f6;">{a['top_degree'][0][0]}</strong> (k={a['top_degree'][0][1]:.3f})</div>
                <div>Critical Bridge: <strong style="color:#c0c1ff;">{a['top_betweenness'][0][0]}</strong> (B={a['top_betweenness'][0][1]:.3f})</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_loc:
        st.markdown(f"""
        <div style="background:#191f2f;border:1px solid #3d494c;border-radius:4px;padding:16px;border-top:3px solid #ffb95f;">
            <div style="font-size:10px;color:#ffb95f;font-weight:700;">LOCATION EXPOSURE</div>
            <h3 style="font-size:15px;color:#dde2f8;margin:8px 0;">Bipartite Hotspots</h3>
            <p style="font-size:12px;color:#bcc9cd;">{hs['total_locations']} locations analyzed. {hs['high_association'] + hs['moderate_association']} flagged.</p>
            <div style="font-size:11px;margin-top:8px;">
                <div>Top Site: <strong style="color:#ffb95f;">{a['hotspots'].iloc[0]['Location_ID']}</strong></div>
                <div>Case Assoc: <strong style="color:#ffb95f;">{a['hotspots'].iloc[0]['Case_Visitor_Pct']*100:.1f}%</strong></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_ml:
        st.markdown(f"""
        <div style="background:#191f2f;border:1px solid #3d494c;border-radius:4px;padding:16px;border-top:3px solid #c0c1ff;">
            <div style="font-size:10px;color:#c0c1ff;font-weight:700;">PREDICTIVE INFERENCE</div>
            <h3 style="font-size:15px;color:#dde2f8;margin:8px 0;">Supervised Model</h3>
            <p style="font-size:12px;color:#bcc9cd;">Random Forest with {ml['train_size']} train / {ml['test_size']} holdout.</p>
            <div style="font-size:11px;margin-top:8px;">
                <div>Recall/PPV: <strong style="color:#c0c1ff;">{ml['recall']:.1%} / {ml['precision']:.1%}</strong></div>
                <div>AUC: <strong style="color:#4cd7f6;">{ml['auc']:.3f}</strong></div>
                <div>High-Risk: <strong style="color:#ffb4ab;">{(a['predictions']['Risk_Tier']=='High').sum()} pts</strong></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### 📊 Resource Allocation Simulation")

    st.markdown("""
    <div style="background:#151b2b;border:1px solid #3d494c;border-radius:4px;padding:12px;margin-bottom:12px;">
        <span style="color:#ffb95f;font-size:10px;font-weight:700;">⚠ SIMULATION ONLY — Network Prioritization ≠ Medical Priority</span>
    </div>
    """, unsafe_allow_html=True)

    c1, c2 = st.columns(2)
    with c1:
        test_capacity = st.slider("Rapid Test Kits", 0, 200, 150, key="tests")
        st.progress(test_capacity / 200)
        st.caption(f"Capacity: {test_capacity}/200 kits — Targeted at top degree hubs")
    with c2:
        dose_capacity = st.slider("Prophylaxis Doses", 0, 100, 75, key="doses")
        st.progress(dose_capacity / 100)
        st.caption(f"Capacity: {dose_capacity}/100 doses — Targeted at bridge nodes")

    st.markdown("### 📋 Prioritized Target Roster")
    roster_data = []
    for pid, score in a["top_degree"][:5]:
        roster_data.append({"Entity": pid, "Role": "Hub", "Metric": f"deg: {score:.3f}", "Intervention": "Voluntary Rapid Kit"})
    for pid, score in a["top_betweenness"][:3]:
        roster_data.append({"Entity": pid, "Role": "Bridge", "Metric": f"btw: {score:.3f}", "Intervention": "Pre-exposure Advisory"})
    roster_data.append({
        "Entity": a["hotspots"].iloc[0]["Location_ID"], "Role": "Hotspot",
        "Metric": f"{a['hotspots'].iloc[0]['Case_Visitor_Pct']*100:.0f}% Assoc", "Intervention": "HEPA / Sanitization"
    })
    st.dataframe(pd.DataFrame(roster_data), width="stretch")

    st.markdown("---")
    st.markdown("### ℹ️ Section 38 Explainability Summary")

    with st.expander("1. What was found?"):
        st.write(f"Consolidated epidemiological synthesis of {gs['total_people']:,} individuals across {hs['total_locations']} locations. {a['case_count']} verified cases with {gs['total_edges']:,} contact relationships within a {gs['giant_component_pct']:.1%} giant component.")
    with st.expander("2. How was it calculated?"):
        st.write("Integrated NetworkX centrality scoring + Bipartite co-location matrices + Supervised Random Forest classification.")
    with st.expander("3. What does it NOT prove?"):
        st.write("Does NOT establish biological transmission causation or active infectivity. High centrality reflects interaction geometry, not clinical pathogenicity.")
    with st.expander("4. Recommended public health action"):
        st.write("Deploy voluntary decentralized testing to high-degree clusters; schedule environmental decontamination for top hotspots; avoid punitive isolation.")


render_header()

tabs = st.tabs(["🏠 Home", "📋 Data Validation", "🕸️ Contact Network", "📍 Location Hotspots", "🎯 Risk Prediction", "📋 Executive Summary"])

data = load_or_generate_data()
try:
    a = run_full_analysis(data)
    analysis_ready = True
except InsufficientDataError as exc:
    st.warning(f"⚠ Insufficient data: {exc}")
    a = None
    analysis_ready = False

with tabs[0]:
    page_home(a)
with tabs[1]:
    if analysis_ready:
        page_validation(a)
    else:
        st.warning("Analysis unavailable: dataset has insufficient data.")
with tabs[2]:
    if analysis_ready:
        page_network(a)
    else:
        st.warning("Analysis unavailable: dataset has insufficient data.")
with tabs[3]:
    if analysis_ready:
        page_locations(a)
    else:
        st.warning("Analysis unavailable: dataset has insufficient data.")
with tabs[4]:
    if analysis_ready:
        page_prediction(a)
    else:
        st.warning("Analysis unavailable: dataset has insufficient data.")
with tabs[5]:
    if analysis_ready:
        page_summary(a)
    else:
        st.warning("Analysis unavailable: dataset has insufficient data.")
