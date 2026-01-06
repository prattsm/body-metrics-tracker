from __future__ import annotations


def main() -> None:
    try:
        from .gui.app import main as gui_main
    except ImportError as exc:
        raise SystemExit(
            "PySide6 is required to run the GUI. Install dependencies with: pip install -e .[dev]"
        ) from exc

    gui_main()


if __name__ == "__main__":
    main()
