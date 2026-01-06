from __future__ import annotations

from PySide6.QtGui import QColor, QFont, QPalette
from PySide6.QtWidgets import QApplication


def apply_app_theme(app: QApplication, accent_color: str = "#4f8cf7", dark_mode: bool = False) -> None:
    app.setStyle("Fusion")
    app.setFont(QFont("Avenir Next", 10))

    accent = _parse_color(accent_color, "#4f8cf7")
    accent_hover = accent.darker(110)
    accent_pressed = accent.darker(125)
    accent_disabled = accent.lighter(170)
    accent_rgba = f"rgba({accent.red()}, {accent.green()}, {accent.blue()}, 40)"

    palette = QPalette()
    if dark_mode:
        palette.setColor(QPalette.Window, QColor(18, 22, 30))
        palette.setColor(QPalette.WindowText, QColor(233, 238, 247))
        palette.setColor(QPalette.Base, QColor(24, 29, 38))
        palette.setColor(QPalette.AlternateBase, QColor(30, 36, 46))
        palette.setColor(QPalette.Text, QColor(233, 238, 247))
        palette.setColor(QPalette.Button, QColor(30, 36, 46))
        palette.setColor(QPalette.ButtonText, QColor(233, 238, 247))
        palette.setColor(QPalette.Highlight, accent)
        palette.setColor(QPalette.HighlightedText, QColor(255, 255, 255))
        palette.setColor(QPalette.ToolTipBase, QColor(22, 28, 36))
        palette.setColor(QPalette.ToolTipText, QColor(233, 238, 247))
        window = "#12161e"
        card = "#1b212c"
        border = "#2a3240"
        text = "#e9eef7"
        muted = "#a1a9b6"
        table_header = "#1f2632"
        tab_bg = "#1a202b"
        tab_active = "#202838"
    else:
        palette.setColor(QPalette.Window, QColor(246, 248, 252))
        palette.setColor(QPalette.WindowText, QColor(24, 32, 44))
        palette.setColor(QPalette.Base, QColor(255, 255, 255))
        palette.setColor(QPalette.AlternateBase, QColor(241, 245, 250))
        palette.setColor(QPalette.Text, QColor(24, 32, 44))
        palette.setColor(QPalette.Button, QColor(255, 255, 255))
        palette.setColor(QPalette.ButtonText, QColor(24, 32, 44))
        palette.setColor(QPalette.Highlight, accent)
        palette.setColor(QPalette.HighlightedText, QColor(255, 255, 255))
        palette.setColor(QPalette.ToolTipBase, QColor(24, 32, 44))
        palette.setColor(QPalette.ToolTipText, QColor(255, 255, 255))
        window = "#f6f8fc"
        card = "#ffffff"
        border = "#e3e8f0"
        text = "#18202c"
        muted = "#6b7785"
        table_header = "#f1f4f9"
        tab_bg = "#edf1f7"
        tab_active = "#ffffff"
    app.setPalette(palette)

    app.setStyleSheet(
        f"""
        QWidget {{
            color: {text};
        }}
        QGroupBox {{
            background: {card};
            border: 1px solid {border};
            border-radius: 12px;
            margin-top: 16px;
            padding: 10px;
        }}
        QGroupBox::title {{
            subcontrol-origin: margin;
            left: 12px;
            padding: 0 6px;
            color: {muted};
            font-weight: 600;
        }}
        QLineEdit, QDateEdit, QComboBox, QDoubleSpinBox, QSpinBox {{
            background: {card};
            border: 1px solid {border};
            border-radius: 8px;
            padding: 6px 8px;
        }}
        QLineEdit:focus, QDateEdit:focus, QComboBox:focus,
        QDoubleSpinBox:focus, QSpinBox:focus {{
            border: 1px solid {accent.name()};
        }}
        QPushButton {{
            padding: 8px 14px;
            border-radius: 8px;
            background-color: {accent.name()};
            color: #ffffff;
            font-weight: 600;
        }}
        QPushButton:default {{
            background-color: {accent_hover.name()};
        }}
        QPushButton:hover {{
            background-color: {accent_hover.name()};
        }}
        QPushButton:pressed {{
            background-color: {accent_pressed.name()};
        }}
        QPushButton:disabled {{
            background-color: {accent_disabled.name()};
            color: #f3f6fb;
        }}
        QCheckBox {{
            spacing: 8px;
        }}
        QTabWidget::pane {{
            border: 1px solid {border};
            border-radius: 10px;
            top: -1px;
            background: {card};
        }}
        QTabBar::tab {{
            background: {tab_bg};
            padding: 8px 16px;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            margin-right: 4px;
            color: {muted};
        }}
        QTabBar::tab:selected {{
            background: {tab_active};
            border: 1px solid {border};
            border-bottom-color: {tab_active};
            color: {text};
        }}
        QHeaderView::section {{
            background: {table_header};
            padding: 6px;
            border: none;
            color: {muted};
            font-weight: 600;
        }}
        QTableWidget {{
            gridline-color: {border};
            border: 1px solid {border};
            border-radius: 10px;
        }}
        QTableWidget::item:selected {{
            background: {accent_rgba};
            color: {text};
        }}
        QLabel#statusLabel {{
            color: {muted};
        }}
        QGroupBox#todayCard {{
            background: {"#f4f8ff" if not dark_mode else "#1e2532"};
            border: 1px solid {"#dbe6fb" if not dark_mode else "#2a3240"};
        }}
        QLabel#accentSwatch {{
            border: 1px solid {border};
            border-radius: 6px;
            min-width: 28px;
            min-height: 18px;
            background: {accent.name()};
        }}
        """
    )


def _parse_color(value: str, fallback: str) -> QColor:
    color = QColor(value)
    if not color.isValid():
        color = QColor(fallback)
    return color
