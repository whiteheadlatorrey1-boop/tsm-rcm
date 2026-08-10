from PIL import Image, ImageDraw, ImageFont
import os

# Create directory
os.makedirs('html/demo-screenshots/career-training', exist_ok=True)

shots = [
    ('001-platform-load', 'Career Training Platform'),
    ('002-select-course', 'Choose your learning path'),
    ('003-load-case-study', 'Load a live case'),
    ('004-walk-through-escalation', 'Follow the escalation chain'),
    ('005-see-engine-findings', 'Understand the engines'),
    ('006-strategist-reasoning', 'Study strategist thinking'),
    ('007-executive-view', 'Executive decision context'),
    ('008-quiz-and-assess', 'Test yourself on similar cases'),
    ('009-track-progress', 'Build competency over time'),
]

for shot_name, caption in shots:
    # Create image
    img = Image.new('RGB', (1200, 675), color='#0a1628')
    draw = ImageDraw.Draw(img)
    
    # Draw caption in center
    text = caption
    draw.text((600, 337), text, fill='#00e5ff', anchor='mm')
    
    # Save
    path = f'html/demo-screenshots/career-training/{shot_name}.png'
    img.save(path)
    print(f'✓ Created {path}')

print('Done!')
