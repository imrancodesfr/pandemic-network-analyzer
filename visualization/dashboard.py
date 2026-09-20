import streamlit as st
import pandas as pd
import numpy as np


def render_metric_card(label: str, value: str, sub: str = "", color: str = "primary"):
    colors = {
        "primary": "#4cd7f6", "secondary": "#c0c1ff", "tertiary": "#ffb95f",
        "error": "#ffb4ab", "success": "#4cd7f6",
    }
    c = colors.get(color, "#4cd7f6")
    st.markdown(f"""
    <div style="background:#191f2f;border:1px solid #3d494c;border-radius:4px;padding:12px;
                border-left:3px solid {c};">
        <div style="font-size:10px;color:#bcc9cd;text-transform:uppercase;letter-spacing:0.05em;">{label}</div>
        <div style="font-size:24px;font-weight:700;color:{c};margin:4px 0;">{value}</div>
        <div style="font-size:10px;color:#869397;">{sub}</div>
    </div>
    """, unsafe_allow_html=True)


def render_guardrail_banner(text: str):
    st.markdown(f"""
    <div style="background:#080e1d;border:1px solid #3131c0;border-radius:4px;padding:8px 12px;
                margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        <span style="color:#c0c1ff;font-size:11px;font-family:'JetBrains Mono',monospace;
               font-weight:700;letter-spacing:0.05em;">{text}</span>
    </div>
    """, unsafe_allow_html=True)


def render_validation_status(status: str, code: str, message: str, n: int = 0):
    icon_map = {"PASS": "✅", "WARNING": "⚠️", "ERROR": "❌"}
    color_map = {"PASS": "#4cd7f6", "WARNING": "#ffb95f", "error": "#ffb4ab"}
    icon = icon_map.get(status, "ℹ️")
    color = color_map.get(status, "#869397")
    st.markdown(f"""
    <div style="background:#151b2b;border:1px solid #3d494c;border-radius:4px;padding:8px 12px;
                margin:4px 0;border-left:3px solid {color};">
        <span style="font-size:12px;">{icon}</span>
        <span style="font-size:12px;font-family:'JetBrains Mono',monospace;color:{color};
               font-weight:600;">[{status}]</span>
        <span style="font-size:12px;font-family:'JetBrains Mono',monospace;color:#dde2f8;">
               {code}</span>
        <span style="font-size:12px;color:#bcc9cd;"> — {message}</span>
    </div>
    """, unsafe_allow_html=True)
