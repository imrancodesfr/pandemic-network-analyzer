import plotly.graph_objects as go
import plotly.express as px
import pandas as pd


def centrality_bar_chart(df: pd.DataFrame, metric: str, top_n: int = 25, title: str = "") -> go.Figure:
    top = df.nlargest(top_n, metric)
    fig = go.Figure(go.Bar(
        x=top[metric], y=top["Person_ID"], orientation="h",
        marker=dict(color=top[metric], colorscale="Viridis"),
        text=[f"{v:.3f}" for v in top[metric]], textposition="outside",
    ))
    fig.update_layout(
        title=dict(text=title or f"Top {top_n} by {metric}", font=dict(size=14)),
        plot_bgcolor="#080e1d", paper_bgcolor="#0d1322",
        font=dict(color="#dde2f8"), height=400,
        xaxis=dict(title=metric, gridcolor="#3d494c"),
        yaxis=dict(autorange="reversed"),
        margin=dict(l=10, r=60, t=40, b=40),
    )
    return fig


def exposure_bar_chart(df: pd.DataFrame, top_n: int = 20) -> go.Figure:
    top = df.head(top_n).copy()
    top["Pct_Display"] = top["Case_Visitor_Pct"] * 100
    fig = go.Figure(go.Bar(
        x=top["Location_ID"], y=top["Pct_Display"],
        marker=dict(
            color=top["Classification"].map({
                "High Association": "#f43f5e",
                "Moderate Association": "#ffb95f",
                "Low Association": "#869397",
                "Insufficient Data": "#93000a",
            }),
        ),
        text=[f"{p:.1f}%" for p in top["Pct_Display"]],
        textposition="outside",
        hovertext=[f"{row['Location_ID']}<br>Cases: {row['Unique_Case_Visitors']}<br>Visitors: {row['Unique_Visitors']}"
                   for _, row in top.iterrows()],
        hoverinfo="text",
    ))
    fig.update_layout(
        title="Case-Visitor Percentage by Location",
        plot_bgcolor="#080e1d", paper_bgcolor="#0d1322",
        font=dict(color="#dde2f8"), height=400,
        xaxis=dict(title="Location", tickangle=-45),
        yaxis=dict(title="% of Identified Cases"),
        margin=dict(l=10, r=10, t=40, b=80),
    )
    return fig


def confusion_matrix_heatmap(cm, title: str = "Confusion Matrix") -> go.Figure:
    labels = ["Negative", "Positive"]
    fig = go.Figure(go.Heatmap(
        z=cm, x=[f"Pred {l}" for l in labels], y=[f"Actual {l}" for l in labels],
        colorscale="Blues", text=cm, texttemplate="%{text}", textfont=dict(size=16),
    ))
    fig.update_layout(
        title=dict(text=title, font=dict(size=14)),
        plot_bgcolor="#080e1d", paper_bgcolor="#0d1322",
        font=dict(color="#dde2f8"), height=300,
        xaxis=dict(side="top"), margin=dict(l=10, r=10, t=50, b=10),
    )
    return fig


def feature_importance_chart(importance: dict, title: str = "Feature Importance") -> go.Figure:
    sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    names = [x[0] for x in sorted_imp]
    values = [x[1] for x in sorted_imp]
    colors = ["#4cd7f6", "#c0c1ff", "#ffb95f", "#869397", "#3d494c"] * 2
    fig = go.Figure(go.Bar(
        x=values, y=names, orientation="h",
        marker=dict(color=colors[:len(names)]),
        text=[f"{v:.1%}" for v in values], textposition="outside",
    ))
    fig.update_layout(
        title=dict(text=title, font=dict(size=14)),
        plot_bgcolor="#080e1d", paper_bgcolor="#0d1322",
        font=dict(color="#dde2f8"), height=350,
        xaxis=dict(title="Importance", gridcolor="#3d494c"),
        yaxis=dict(autorange="reversed"),
        margin=dict(l=10, r=60, t=40, b=40),
    )
    return fig


def risk_distribution_chart(predictions_df: pd.DataFrame) -> go.Figure:
    fig = px.histogram(
        predictions_df, x="Predicted_Risk", nbins=50,
        color="Risk_Tier", barmode="overlay",
        color_discrete_map={"High": "#f43f5e", "Moderate": "#ffb95f", "Low": "#4cd7f6"},
        title="Risk Score Distribution",
    )
    fig.update_layout(
        plot_bgcolor="#080e1d", paper_bgcolor="#0d1322",
        font=dict(color="#dde2f8"), height=350,
        xaxis=dict(title="Predicted Risk Score", gridcolor="#3d494c"),
        yaxis=dict(title="Count"),
        margin=dict(l=10, r=10, t=40, b=40),
    )
    return fig
