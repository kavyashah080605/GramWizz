import os
import secrets
# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify, send_from_directory
# pyrefly: ignore [missing-import]
from groq import Groq
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from werkzeug.utils import secure_filename
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Security configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize Groq client with error handling
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY environment variable is required")

try:
    client = Groq(api_key=api_key)
except Exception as e:
    print(f"Error initializing Groq client: {e}")
    client = None


# Security headers middleware
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers[
        'Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers[
        'Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' https://cdnjs.cloudflare.com;"
    return response


# Input validation functions
def validate_text_input(text, max_length=1000):
    if not text or not isinstance(text, str):
        return False
    if len(text.strip()) == 0 or len(text) > max_length:
        return False
    # Remove potential XSS patterns
    text = re.sub(r'<[^>]*>', '', text)
    return text.strip()


def validate_tone(tone):
    allowed_tones = [
        'Friendly', 'Professional', 'Casual', 'Funny', 'Motivational',
        'Creative'
    ]
    return tone if tone in allowed_tones else 'Friendly'


def validate_niche(niche):
    allowed_niches = [
        'Lifestyle', 'Fitness', 'Travel', 'Finance', 'Education', 'Fashion',
        'Tech', 'Motivation'
    ]
    return niche if niche in allowed_niches else 'Lifestyle'


def validate_content_type(content_type):
    allowed_types = ['Post', 'Reel', 'Story', 'Carousel']
    return content_type if content_type in allowed_types else 'Post'


@app.route('/')
def home():
    return send_from_directory('.', 'ui.html')


@app.route('/api.js')
def serve_api_js():
    return send_from_directory('.', 'api.js')


@app.route('/logo.png')
def serve_logo():
    return send_from_directory('.', 'logo.png')


def is_premium_user():
    """Check if user has premium access"""
    return False


@app.route('/api/generate-captions', methods=['POST'])
def generate_captions():
    try:
        if not client:
            return jsonify({
                'success': False,
                'error': 'Service temporarily unavailable'
            }), 503

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        topic = validate_text_input(data.get('topic', ''), 500)
        if not topic:
            return jsonify({
                'success':
                False,
                'error':
                'Please provide a valid topic (1-500 characters)'
            }), 400

        tone = validate_tone(data.get('tone', 'Friendly'))

        caption_prompt = f"""Write exactly 3 engaging Instagram captions about {topic} in a {tone} tone.

        Each caption must:
        - Start directly with the caption (no intro or explanation)
        - Include a creative hook or relatable thought
        - Contain relevant emojis that match the tone
        - End with popular and niche hashtags for reach

        Do not add any extra text. Just output the 3 captions only."""

        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{
                "role":
                "system",
                "content":
                "You are a social media expert who writes viral Instagram captions."
            }, {
                "role": "user",
                "content": caption_prompt
            }],
            max_tokens=1000,
            temperature=0.7)

        captions_text = response.choices[0].message.content.strip()
        captions = [
            caption.strip() for caption in captions_text.split("\n\n")
            if caption.strip()
        ]

        return jsonify({
            'success': True,
            'captions': captions[:3]  # Limit to 3 captions
        })

    except Exception as e:
        print(f"Error in generate_captions: {e}")
        return jsonify({
            'success':
            False,
            'error':
            'Failed to generate captions. Please try again.'
        }), 500


@app.route('/api/generate-photo-captions', methods=['POST'])
def generate_photo_captions():
    try:
        if not client:
            return jsonify({
                'success': False,
                'error': 'Service temporarily unavailable'
            }), 503

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        photo_description = validate_text_input(
            data.get('photo_description', ''), 500)
        if not photo_description:
            return jsonify({
                'success': False,
                'error': 'Please provide a valid photo description'
            }), 400

        tone = validate_tone(data.get('tone', 'Friendly'))

        caption_prompt = f"Analyze this photo description and write 3 Instagram captions in a {tone} tone. Photo description: {photo_description}. Include emojis and relevant hashtags."

        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{
                "role":
                "system",
                "content":
                "You are a social media expert who writes viral Instagram captions based on photo descriptions."
            }, {
                "role": "user",
                "content": caption_prompt
            }],
            max_tokens=1000,
            temperature=0.7)

        captions_text = response.choices[0].message.content.strip()
        captions = [
            caption.strip() for caption in captions_text.split("\n\n")
            if caption.strip()
        ]

        return jsonify({'success': True, 'captions': captions[:3]})

    except Exception as e:
        print(f"Error in generate_photo_captions: {e}")
        return jsonify({
            'success':
            False,
            'error':
            'Failed to generate photo captions. Please try again.'
        }), 500


@app.route('/api/generate-hashtags', methods=['POST'])
def generate_hashtags():
    try:
        if not client:
            return jsonify({
                'success': False,
                'error': 'Service temporarily unavailable'
            }), 503

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        caption = validate_text_input(data.get('caption', ''), 1000)
        if not caption:
            return jsonify({
                'success': False,
                'error': 'Please provide a valid caption'
            }), 400

        hashtag_prompt = f"""Generate exactly 10 relevant and high-performing Instagram hashtags for the following caption:

        '{caption}'

        Return only the hashtags in a single line, separated by spaces. Format: #hashtag1 #hashtag2 #hashtag3 ...

        Do not include any explanations, titles, or extra text. Output only the hashtags."""

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{
                "role":
                "system",
                "content":
                "You generate Instagram hashtags. Return ONLY hashtags with # symbol, no explanations or descriptions."
            }, {
                "role": "user",
                "content": hashtag_prompt
            }],
            max_tokens=200,
            temperature=0.5)

        hashtags = response.choices[0].message.content.strip()

        return jsonify({'success': True, 'hashtags': hashtags})

    except Exception as e:
        print(f"Error in generate_hashtags: {e}")
        return jsonify({
            'success':
            False,
            'error':
            'Failed to generate hashtags. Please try again.'
        }), 500


@app.route('/api/generate-dm-reply', methods=['POST'])
def generate_dm_reply():
    try:
        if not client:
            return jsonify({
                'success': False,
                'error': 'Service temporarily unavailable'
            }), 503

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        dm_text = validate_text_input(data.get('dm_text', ''), 500)
        if not dm_text:
            return jsonify({
                'success': False,
                'error': 'Please provide a valid DM text'
            }), 400

        profile_type = validate_text_input(data.get('profile_type', 'Creator'),
                                           100)

        dm_prompt = f"""You are an Instagram creator in the {profile_type} niche. 

        Write a friendly and engaging reply to the following DM:

        "{dm_text}"

        Respond naturally, as if you’re chatting with a follower. Keep it casual, kind, and in your             voice. Do not include any explanations or headers—just the reply message."""

        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{
                "role":
                "system",
                "content":
                "You're a social media influencer assistant helping with DM replies."
            }, {
                "role": "user",
                "content": dm_prompt
            }],
            max_tokens=500,
            temperature=0.7)

        reply = response.choices[0].message.content.strip()

        return jsonify({'success': True, 'reply': reply})

    except Exception as e:
        print(f"Error in generate_dm_reply: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate reply. Please try again.'
        }), 500


@app.route('/api/generate-post-ideas', methods=['POST'])
def generate_post_ideas():
    try:
        if not client:
            return jsonify({
                'success': False,
                'error': 'Service temporarily unavailable'
            }), 503

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        niche = validate_niche(data.get('niche', 'Lifestyle'))
        content_type = validate_content_type(data.get('content_type', 'Post'))

        # Generate dynamic post ideas using AI
        ideas_prompt = f"""Generate 5 unique and creative Instagram {content_type} ideas for the {niche} niche.

        For each idea, provide:
        1. A catchy title
        2. An engaging hook (opening line that grabs attention)
        3. A brief description of the content concept

        Make the ideas fresh, trendy, and engaging. Vary the content types (educational, behind-the-scenes, tips, personal stories, trending topics, etc.).

        Format your response as JSON with this structure:
        [
          {{
            "title": "Title here",
            "hook": "Hook here",
            "description": "Description here"
          }}
        ]

        Only return the JSON array, no additional text."""

        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{
                "role": "system",
                "content": "You are a creative social media strategist who generates viral content ideas. Always respond with valid JSON only."
            }, {
                "role": "user",
                "content": ideas_prompt
            }],
            max_tokens=1500,
            temperature=0.8  # Higher temperature for more creativity
        )

        ideas_text = response.choices[0].message.content.strip()
        
        try:
            # Try to parse the JSON response
            import json
            ideas = json.loads(ideas_text)
            
            # Ensure we have exactly 5 ideas
            if len(ideas) > 5:
                ideas = ideas[:5]
            elif len(ideas) < 5:
                # Fallback to ensure we always have 5 ideas
                while len(ideas) < 5:
                    ideas.append({
                        "title": f"Creative {niche} Content",
                        "hook": "Here's something you haven't seen before...",
                        "description": f"Share unique insights about {niche} that will engage your audience."
                    })
                    
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            ideas = [
                {
                    "title": f"Fresh {niche} Perspective",
                    "hook": "Let me change your mind about this...",
                    "description": f"Share a unique perspective on {niche} that challenges common thinking."
                },
                {
                    "title": f"{niche} Behind the Scenes",
                    "hook": "What really happens when nobody's watching...",
                    "description": f"Give your audience a peek behind the curtain of your {niche} journey."
                },
                {
                    "title": f"Trending in {niche}",
                    "hook": "Everyone's talking about this, but here's what they're missing...",
                    "description": f"Jump on current trends in {niche} with your unique angle."
                },
                {
                    "title": f"{niche} Reality Check",
                    "hook": "Time for some brutal honesty...",
                    "description": f"Share the real, unfiltered truth about {niche} that others won't tell."
                },
                {
                    "title": f"Quick {niche} Wins",
                    "hook": "This simple trick changed everything for me...",
                    "description": f"Share actionable tips that can make an immediate impact in {niche}."
                }
            ]

        return jsonify({'success': True, 'ideas': ideas})

    except Exception as e:
        print(f"Error in generate_post_ideas: {e}")
        return jsonify({
            'success':
            False,
            'error':
            'Failed to generate post ideas. Please try again.'
        }), 500


@app.route('/api/generate-bulk-captions', methods=['POST'])
def generate_bulk_captions():
    try:
        if not client:
            return jsonify({
                'success': False,
                'error': 'Service temporarily unavailable'
            }), 503

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        file_names = data.get('file_names', [])
        if not file_names or len(file_names) > 10:  # Limit bulk processing
            return jsonify({
                'success': False,
                'error': 'Please provide 1-10 file names'
            }), 400

        general_topic = validate_text_input(data.get('general_topic', ''), 200)
        tone = validate_tone(data.get('tone', 'Friendly'))

        captions = []
        for i, file_name in enumerate(file_names[:10]):  # Limit to 10 files
            safe_filename = secure_filename(
                file_name) if file_name else f"Image {i+1}"
            context = general_topic if general_topic else f"Image {i+1}"

            prompt = f"Write a catchy Instagram caption in a {tone} tone for this photo based on this context: {context}. Include emojis and relevant hashtags."

            try:
                response = client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=[{
                        "role":
                        "system",
                        "content":
                        "You're a social media assistant that writes viral Instagram captions."
                    }, {
                        "role": "user",
                        "content": prompt
                    }],
                    max_tokens=300,
                    temperature=0.7)
                caption = response.choices[0].message.content.strip()
                captions.append(caption)
            except Exception as e:
                print(f"Error generating caption for {safe_filename}: {e}")
                captions.append(f"Caption for {safe_filename} - {context}")

        return jsonify({'success': True, 'captions': captions})

    except Exception as e:
        print(f"Error in generate_bulk_captions: {e}")
        return jsonify({
            'success':
            False,
            'error':
            'Failed to generate bulk captions. Please try again.'
        }), 500


@app.route('/api/submit-feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        feedback = validate_text_input(data.get('feedback', ''), 1000)
        if not feedback:
            return jsonify({
                'success': False,
                'error': 'Please provide valid feedback'
            }), 400

        rating = validate_text_input(data.get('rating', ''), 50)

        # Log feedback securely (in production, save to database)
        print(
            f"Feedback received - Rating: {rating}, Length: {len(feedback)} chars"
        )

        return jsonify({
            'success': True,
            'message': 'Feedback submitted successfully'
        })

    except Exception as e:
        print(f"Error in submit_feedback: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to submit feedback. Please try again.'
        }), 500


@app.route('/api/join-beta', methods=['POST'])
def join_beta():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400

        email = data.get('email', '').strip()

        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not email or not re.match(email_pattern, email) or len(email) > 254:
            return jsonify({
                'success': False,
                'error': 'Please provide a valid email address'
            }), 400

        # Log beta signup securely (in production, save to database)
        print(f"Beta signup: {email[:10]}..."
              )  # Log only first 10 chars for security

        return jsonify({
            'success': True,
            'message': 'Successfully joined beta'
        })

    except Exception as e:
        print(f"Error in join_beta: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to join beta. Please try again.'
        }), 500


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


@app.errorhandler(413)
def too_large(error):
    return jsonify({'error': 'File too large'}), 413


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)