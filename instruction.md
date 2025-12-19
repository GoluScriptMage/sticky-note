🎨 1. Aesthetic Philosophy: "The Modern Architect"
The Vibe: The app should not look like a toy; it should feel like a high-end professional design tool (think Figma or Miro).

The Background (The Soul): Use a complex, repeatable SVG pattern—specifically a Circuit Board or Technical Grid.

Minimalism: Use a "Dark Mode" or "High-Contrast Light Mode" to keep the focus on the sticky notes.

📏 2. Physics & The "Raw Dimension" Engine
Cross-Device Truth: Since this app must work perfectly on both Desktop and Mobile, the "Screen Size" is a lie.

Normalized Coordinates: Every object’s position must be calculated and stored as a Percentage (0.0 to 100.0) of the canvas width and height.

Translation: * When moving an object: (Current_PX / Screen_Total_PX) * 100.

When rendering an object: (Percentage / 100) * User_Device_Width.

Responsive Scaling: Stickies should use relative units (like vw or percentages) so they scale down proportionally on smaller phone screens.

🏃 3. Interaction & "Expensive" Feel
Motion over Static: Nothing should just "snap" into place; use GSAP for all transitions and dragging to create a smooth, high-quality feel.

The "Dotted" Anchor: Visual elements (like notes) should feel like they are "floating" over the dotted/circuit background.

State Persistence: All user identities and room preferences must be tied to localStorage to ensure the "Sticky" part of the sync starts before the server even responds.

🌈 4. Color System
Primary Canvas: Low-saturation, neutral background (Grit/Gray/Off-white).

Note Palette: High-impact, recognizable "Post-it" colors (Neon Yellow, Cyan Blue, Soft Pink) to distinguish different users' contributions instantly.