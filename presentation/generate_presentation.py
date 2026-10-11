#!/usr/bin/env python3
"""
Generate the official 6-slide SIH submission PPTX for Problem Statement 26247:
AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
Sponsor: Ministry of Defence (MoD) / Defence Services Staff College (DSSC)
Team: Phoenix X
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

TEMPLATE_PATH = "presentation/phoenix_format.pptx"
OUTPUT_PATH = "presentation/SIH_26247_Phoenix_X.pptx"

def set_run(p, text, size_pt=13, bold=False, color_rgb=(255, 255, 255), font_name="Calibri"):
    p.text = ""  # clear
    run = p.add_run()
    run.text = text
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.color.rgb = RGBColor(*color_rgb)
    return run

def add_bullet_item(tf, title, body, title_color=(100, 200, 255), body_color=(235, 238, 245), title_size=13, body_size=12):
    p = tf.add_paragraph()
    p.space_after = Pt(8)
    p.space_before = Pt(2)
    
    r_title = p.add_run()
    r_title.text = "• " + title + ": "
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(title_size)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(*title_color)
    
    r_body = p.add_run()
    r_body.text = body
    r_body.font.name = "Calibri"
    r_body.font.size = Pt(body_size)
    r_body.font.bold = False
    r_body.font.color.rgb = RGBColor(*body_color)
    return p

def main():
    prs = Presentation(TEMPLATE_PATH)
    print(f"Loaded template with {len(prs.slides)} slides.")
    
    # -------------------------------------------------------------
    # SLIDE 1: TITLE SLIDE (Official SIH Template Header Fields)
    # -------------------------------------------------------------
    slide1 = prs.slides[0]
    tb1 = slide1.shapes[4].text_frame
    
    # Preserve original typography and exact fields:
    # p[1] -> Problem Statement ID
    tb1.paragraphs[1].text = "26247"
    if tb1.paragraphs[1].runs:
        tb1.paragraphs[1].runs[0].font.name = "Arial"
        tb1.paragraphs[1].runs[0].font.size = Pt(24)
        tb1.paragraphs[1].runs[0].font.bold = True
        
    # p[2] -> Problem Statement Title / Description
    tb1.paragraphs[2].text = "AI-Enabled Drone & Counter-Drone Threat Simulation Trainer (Ministry of Defence / Defence Services Staff College)"
    if tb1.paragraphs[2].runs:
        tb1.paragraphs[2].runs[0].font.name = "Arial"
        tb1.paragraphs[2].runs[0].font.size = Pt(13)
        
    # p[3] -> Theme
    tb1.paragraphs[3].text = "Robotics and Drones"
    if tb1.paragraphs[3].runs:
        tb1.paragraphs[3].runs[0].font.name = "Arial"
        tb1.paragraphs[3].runs[0].font.size = Pt(13)
        
    # p[4] -> Category
    tb1.paragraphs[4].text = "Software"
    if tb1.paragraphs[4].runs:
        tb1.paragraphs[4].runs[0].font.name = "Arial"
        tb1.paragraphs[4].runs[0].font.size = Pt(24)
        tb1.paragraphs[4].runs[0].font.bold = True
        
    # p[5] -> Team ID
    tb1.paragraphs[5].text = "141943"
    if tb1.paragraphs[5].runs:
        tb1.paragraphs[5].runs[0].font.name = "Arial"
        tb1.paragraphs[5].runs[0].font.size = Pt(24)
        tb1.paragraphs[5].runs[0].font.bold = True
        
    # p[6] -> Team Name
    tb1.paragraphs[6].text = "Phoenix X"
    if tb1.paragraphs[6].runs:
        tb1.paragraphs[6].runs[0].font.name = "Arial"
        tb1.paragraphs[6].runs[0].font.size = Pt(24)
        tb1.paragraphs[6].runs[0].font.bold = True

    # -------------------------------------------------------------
    # SLIDE 2: IDEA TITLE & PROPOSED SOLUTION
    # -------------------------------------------------------------
    slide2 = prs.slides[1]
    # Update title
    s2_title = slide2.shapes[1].text_frame
    s2_title.text = ""
    p_t = s2_title.paragraphs[0]
    r_t = p_t.add_run()
    r_t.text = "PHOENIX-X: AI-ENABLED DRONE & C-UAS THREAT SIMULATOR"
    r_t.font.name = "Times New Roman"
    r_t.font.size = Pt(24)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(255, 255, 255)
    
    # Update team name in footer if shape 5 exists
    if len(slide2.shapes) > 5 and slide2.shapes[5].has_text_frame:
        slide2.shapes[5].text_frame.text = "Phoenix X"
        
    # Content area (Shape 2) - repopulate cleanly
    s2_body = slide2.shapes[2].text_frame
    s2_body.clear()
    
    add_bullet_item(s2_body, "Core Concept", 
                    "A lightweight, software-based simulation platform engineered for unit-level deployment to train defence personnel in detecting, classifying, and responding to drone and swarm threats across varied environments.")
    add_bullet_item(s2_body, "How It Solves the Problem", 
                    "Replaces expensive, weather-dependent, and infrequent live-fire drills with high-repetition synthetic practice running on standard military-issue laptops without requiring specialized hardware or cloud dependencies.")
    add_bullet_item(s2_body, "Procedural Scenario DNA", 
                    "Seed-reproducible generation of tactical environments across Day/Night, Urban/Rural/Open terrains, degraded sensor conditions (atmospheric noise, low visibility, sensor health degradation), and diverse threat profiles.")
    add_bullet_item(s2_body, "Decision-Tree Cognitive Evaluation", 
                    "Scores operators deterministically on detection reaction latency, multi-class classification accuracy (Benign / Unknown / Unusual), confidence calibration, and abstract engagement decisions (Monitor / Escalate / Resolve).")
    add_bullet_item(s2_body, "After-Action Review (AAR) & Analytics", 
                    "Delivers millisecond-accurate timeline event replays, automated strengths/mistakes coaching diagnostics, and longitudinal unit-level skill retention tracking across repeated sessions to eliminate rote learning.")

    # -------------------------------------------------------------
    # SLIDE 3: TECHNICAL APPROACH
    # -------------------------------------------------------------
    slide3 = prs.slides[2]
    if len(slide3.shapes) > 5 and slide3.shapes[5].has_text_frame:
        slide3.shapes[5].text_frame.text = "Phoenix X"
        
    s3_body = slide3.shapes[2].text_frame
    s3_body.clear()
    
    add_bullet_item(s3_body, "System Architecture & Stack", 
                    "Local-first modular architecture combining a deterministic fixed-step simulation engine, client-side React 19/TypeScript cockpit, Babylon.js 3D/2D tactical viewport, and optional Python 1-click launcher.")
    add_bullet_item(s3_body, "Multi-Sensor Threat Perception Suite", 
                    "Simulates simultaneous feeds including 3D Radar PPI Scope (range, bearing, velocity vectors), Electro-Optical (EO) daylight/night surveillance, and Thermal-like LWIR contrast feeds with synthetic noise degradation.")
    add_bullet_item(s3_body, "Kinematic Modeling & Swarm Trajectories", 
                    "Physics-grounded 3D path generation modeling individual Micro/Mini drones, fast loitering targets, and multi-agent swarm formations with dynamic speed, altitude, and bearing variations.")
    add_bullet_item(s3_body, "Anti-Cheat Ground-Truth Hard Boundary", 
                    "Simulation ground truth is strictly sealed in the engine; trainee classifications and confidence inputs can never overwrite actual entity states, guaranteeing 100% auditable scoring integrity.")
    add_bullet_item(s3_body, "Offline Persistence & Zero-Dependency Execution", 
                    "Local IndexedDB / Dexie client-side persistence and single-file canvas companion enabling instant zero-install execution on forward-deployed hardware without internet connectivity.")

    # -------------------------------------------------------------
    # SLIDE 4: FEASIBILITY AND VIABILITY
    # -------------------------------------------------------------
    slide4 = prs.slides[3]
    if len(slide4.shapes) > 5 and slide4.shapes[5].has_text_frame:
        slide4.shapes[5].text_frame.text = "Phoenix X"
        
    s4_body = slide4.shapes[2].text_frame
    s4_body.clear()
    
    add_bullet_item(s4_body, "Feasibility Analysis (Unit-Level Usability)", 
                    "Engineered specifically for low-overhead execution. Runs smoothly on standard COTS laptops (integrated graphics, 4GB RAM) with zero dependency on expensive external GPU rigs, physical radar hardware, or VR headsets.")
    add_bullet_item(s4_body, "Risk: Rote Learning & Predictability", 
                    "Risk: Trainees memorize fixed drone paths. Mitigation: Pseudorandom Seeded Scenario DNA alters approach vectors, spawn times, environmental visibility, and noise in every run while remaining fully reproducible for instructor evaluation.")
    add_bullet_item(s4_body, "Risk: Connectivity & Field Environment Outages", 
                    "Risk: Forward bases have zero internet access. Mitigation: Fully local-first Progressive Web App (PWA) with self-contained assets and bundled evidence clips ensuring 100% offline mission readiness.")
    add_bullet_item(s4_body, "Risk: Complex Deployment Overhead", 
                    "Risk: Defence units cannot troubleshoot complex installation scripts. Mitigation: Provided with a 1-click Python launcher (`python3 launch_demo.py`) and standalone zero-dependency mobile/desktop preview.")
    add_bullet_item(s4_body, "Operational Viability", 
                    "Immediately adoptable by training establishments (such as Defence Services Staff College) for tactical officer decision-making drills before conducting costly live-fire range exercises.")

    # -------------------------------------------------------------
    # SLIDE 5: IMPACT AND BENEFITS
    # -------------------------------------------------------------
    slide5 = prs.slides[4]
    if len(slide5.shapes) > 5 and slide5.shapes[5].has_text_frame:
        slide5.shapes[5].text_frame.text = "Phoenix X"
        
    s5_body = slide5.shapes[2].text_frame
    s5_body.clear()
    
    add_bullet_item(s5_body, "Dramatic Cost Reduction & Resource Optimization", 
                    "Eliminates the immense recurring expense of expending target drones, fuel, and specialized range safety infrastructure. Delivers unlimited virtual training repetitions at zero per-drill consumable cost.")
    add_bullet_item(s5_body, "High-Repetition Cognitive Muscle Memory", 
                    "Enables soldiers and officers to experience 50+ diverse swarm and single-drone threat scenarios per week, building rapid decision reflexes under time pressure and degraded visibility.")
    add_bullet_item(s5_body, "All-Weather & 24/7 Training Availability", 
                    "Training schedules are no longer canceled due to adverse weather, airspace restrictions, or range scheduling conflicts, ensuring continuous training readiness across all defence units.")
    add_bullet_item(s5_body, "Objective Data-Driven Readiness Auditing", 
                    "Automated After-Action Review (AAR) provides command staff with empirical metrics on unit reaction speed, classification error trends, and engagement judgment over time.")
    add_bullet_item(s5_body, "Strategic Alignment with Atmanirbhar Bharat", 
                    "100% indigenous, sovereign training software designed to fortify India's counter-drone operational doctrine against evolving unmanned aerial threats along borders and vital installations.")

    # -------------------------------------------------------------
    # SLIDE 6: RESEARCH AND REFERENCES
    # -------------------------------------------------------------
    slide6 = prs.slides[5]
    if len(slide6.shapes) > 5 and slide6.shapes[5].has_text_frame:
        slide6.shapes[5].text_frame.text = "Phoenix X"
        
    s6_body = slide6.shapes[2].text_frame
    s6_body.clear()
    
    add_bullet_item(s6_body, "Radar Drone Detection & Micro-Doppler Signatures", 
                    "J. Drozdowicz et al., '35 GHz FMCW radar for drone detection and tracking,' IEEE Radar Conference. Modeling radar cross-section (RCS) fluctuations and range-bearing tracking vectors. [DOI: 10.1109/RADAR.2016.7485122]")
    add_bullet_item(s6_body, "Adverse Weather Optical Drone Classification", 
                    "S. S. A. Ghaffar et al., 'Optical Drone Detection and Classification Under Adverse Weather Conditions,' IEEE Sensors Journal. Grounding synthetic visual degradation, contrast loss, and atmospheric extinction. [DOI: 10.1109/JSEN.2020.3025211]")
    add_bullet_item(s6_body, "Autonomous Swarm Dynamics & Flocking Models", 
                    "C. W. Reynolds, 'Flocks, herds and schools: A distributed behavioral model,' ACM SIGGRAPH. Implementing coordinated multi-agent separation, cohesion, and alignment dynamics for realistic swarm attacks. [DOI: 10.1145/37402.37406]")
    add_bullet_item(s6_body, "Multi-Sensor Fusion in Counter-UAS Systems", 
                    "M. Ezuma et al., 'Micro-UAV Detection and Classification Using Machine Learning Techniques,' IEEE Aerospace and Electronic Systems. Structuring multi-channel radar, EO, and RF track association. [DOI: 10.1109/MAES.2019.2955959]")
    add_bullet_item(s6_body, "Intelligent Tutoring Systems & Simulation AAR", 
                    "R. S. Sottilare et al., 'Design Recommendations for Adaptive Intelligent Tutoring Systems,' Springer. Formulating deterministic decision-tree scoring, confidence calibration, and after-action review feedback loops. [DOI: 10.1007/978-3-319-07227-2]")

    # -------------------------------------------------------------
    # SLIDE 7: DELETE TEMPLATE INSTRUCTION SLIDE
    # (Per instruction on slide 7: 'You can delete this slide when you upload the details of your idea on SIH portal')
    # -------------------------------------------------------------
    if len(prs.slides) > 6:
        rId = prs.slides._sldIdLst[6].rId
        prs.part.drop_rel(rId)
        del prs.slides._sldIdLst[6]
        print("Dropped Slide 7 (Instruction Slide) per SIH submission guideline.")

    # Save presentation
    prs.save(OUTPUT_PATH)
    print(f"[+] Successfully generated official SIH PPTX: {OUTPUT_PATH}")
    print(f"[+] Final slide count: {len(prs.slides)} (Strict SIH 6-Slide limit adhered to)")

if __name__ == "__main__":
    main()
