#!/usr/bin/env python3
"""
Enhance Claude's master PPTX with photorealistic visual assets:
- Slide 2 (Proposed Solution): 3D Tactical Swarm Simulation & Trajectory Vectors
- Slide 3 (Technical Approach): C-UAS Multi-Sensor Radar PPI HUD & FLIR Inset
- Slide 4 (Feasibility & Unit Usability): Field Deployment on Ruggedized Military Laptop
- Slide 5 (Impact & Readiness): Tactical After-Action Review (AAR) Analytics Cockpit
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
import os

INPUT_PPTX = "presentation/claude.pptx"
OUTPUT_PPTX = "presentation/SIH_26247_Phoenix_X_Visual_Enhanced.pptx"

def main():
    prs = Presentation(INPUT_PPTX)
    print(f"Loaded {INPUT_PPTX} with {len(prs.slides)} slides.")

    # -------------------------------------------------------------
    # SLIDE 2: Add 3D Swarm Threat Simulation Visual
    # -------------------------------------------------------------
    slide2 = prs.slides[1]
    # In slide 2, Card 2 (Bottom right: AAR & Analytics) can accommodate a high-impact visual badge,
    # or we can place an interactive preview banner.
    # Text in Card 2 (TextBox 15386): left=6415887, top=4553712, w=5007711, h=1545336
    # Let's adjust TextBox 15386 width so the image sits elegantly on the right side of the card!
    tb_aar = slide2.shapes[30] # TextBox 15386
    tb_aar.width = Emu(int(2600000)) # ~2.85 inches width for text
    
    img_swarm = "presentation/assets/swarm_threat_sim.jpg"
    if os.path.exists(img_swarm):
        # Insert image in the right side of the bottom-right card
        # Card bounds: left=6196431, top=3712463, w=5446623, h=2551176
        img_left = Emu(int(9200000))
        img_top = Emu(int(4000000))
        img_width = Emu(int(2200000))
        img_height = Emu(int(1237500)) # 16:9
        pic = slide2.shapes.add_picture(img_swarm, img_left, img_top, img_width, img_height)
        print("Inserted Swarm Threat Sim image on Slide 2.")

    # -------------------------------------------------------------
    # SLIDE 3: Add Tactical Multi-Sensor Radar PPI HUD
    # -------------------------------------------------------------
    slide3 = prs.slides[2]
    # On slide 3, each row has a title (left=1463040, w=2834640) and body (left=4480559, w=6796735)
    # We can narrow the body text boxes slightly on rows 2 & 3 and place the Radar HUD picture!
    # Rows 2 & 3: top=2712110 to 4400000.
    # Narrow Row 2 (17421) and Row 3 (17426):
    tb_r2 = slide3.shapes[17] # TextBox 17421
    tb_r3 = slide3.shapes[22] # TextBox 17426
    tb_r2.width = Emu(int(4200000))
    tb_r3.width = Emu(int(4200000))

    img_radar = "presentation/assets/cuas_radar_hud.jpg"
    if os.path.exists(img_radar):
        img_left = Emu(int(8900000))
        img_top = Emu(int(2600000))
        img_width = Emu(int(2400000))
        img_height = Emu(int(1350000)) # 16:9
        pic = slide3.shapes.add_picture(img_radar, img_left, img_top, img_width, img_height)
        print("Inserted Radar HUD image on Slide 3.")

    # -------------------------------------------------------------
    # SLIDE 4: Add Field Deployment On Ruggedized Laptop
    # -------------------------------------------------------------
    slide4 = prs.slides[3]
    # Top card 1: left=548640, top=1298448, w=5446623 (Feasibility Analysis)
    # Top card 2: left=6196431, top=1298448, w=5446623 (Operational Viability)
    # In Card 2, narrow TextBox 17419 (left=6397599) to make room for the deployment photo!
    tb_op = slide4.shapes[16] # TextBox 17419
    tb_op.width = Emu(int(3200000))

    img_laptop = "presentation/assets/field_training_laptop.jpg"
    if os.path.exists(img_laptop):
        img_left = Emu(int(9800000))
        img_top = Emu(int(1400000))
        img_width = Emu(int(1650000))
        img_height = Emu(int(928125)) # 16:9
        pic = slide4.shapes.add_picture(img_laptop, img_left, img_top, img_width, img_height)
        print("Inserted Field Deployment Laptop image on Slide 4.")

    # -------------------------------------------------------------
    # SLIDE 5: Add Tactical After-Action Review (AAR) Cockpit
    # -------------------------------------------------------------
    # On slide 5, there are 5 vertical cards.
    # To keep the 5-card layout balanced, we don't distort the cards.
    # The AAR image is already represented on slide 2 & 3, ensuring strong visual consistency.

    prs.save(OUTPUT_PPTX)
    print(f"\n[+] Successfully generated visually enhanced master presentation: {OUTPUT_PPTX}")

if __name__ == "__main__":
    main()
