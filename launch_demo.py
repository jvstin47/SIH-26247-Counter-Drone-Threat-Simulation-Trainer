#!/usr/bin/env python3
"""
Phoenix-X / AID-C2S Master Demo Launcher
Launches the zero-dependency interactive simulation trainer and opens it in your default browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time

PORT = 8080
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mobile-demo")

class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Keep terminal output clean
        pass

def main():
    print("=" * 72)
    print(" Phoenix-X: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer")
    print(" Problem Statement ID: 26247 | Ministry of Defence (MoD) | DSSC")
    print("=" * 72)
    print(f"\n[*] Serving local trainer interface from: {DIRECTORY}")
    print(f"[*] Access URL: http://127.0.0.1:{PORT}/")
    print("\n[+] Opening browser automatically...")

    def open_browser():
        time.sleep(1.0)
        webbrowser.open(f"http://127.0.0.1:{PORT}/")

    threading.Thread(target=open_browser, daemon=True).start()

    with socketserver.TCPServer(("127.0.0.1", PORT), QuietHTTPRequestHandler) as httpd:
        print("[+] Server active. Press Ctrl+C to terminate session.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[-] Shutting down trainer server cleanly.")

if __name__ == "__main__":
    main()
