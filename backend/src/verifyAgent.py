"""
Enki verification agent (Strands Agents SDK).
Used to reject spam / non-water photos before a report goes live.
Runs locally and on Lambda (python3.11 layer). Rule-based v1,
LLM call wired in Day 4 if Bedrock access is available.
"""
from dataclasses import dataclass

ALLOWED_TYPES = {'flood', 'waterlogging', 'leak', 'dry-tap'}
SPAM_HINTS = {'meme', 'selfie', 'screenshot', 'billboard', 'food'}


@dataclass
class Verdict:
    ok: bool
    reason: str
    score: float


def verify_report(report_type: str, caption: str = '', has_photo: bool = False) -> Verdict:
    if report_type not in ALLOWED_TYPES:
        return Verdict(False, f'unknown type {report_type}', 0.0)
    text = (caption or '').lower()
    if any(h in text for h in SPAM_HINTS):
        return Verdict(False, 'looks like spam, not water', 0.1)
    if not has_photo:
        return Verdict(True, 'no photo, allow with low trust', 0.5)
    return Verdict(True, 'photo present, allow', 0.8)


# Strands wiring (optional, no creds needed for v1):
# from strands import Agent
# agent = Agent(system_prompt='You verify flood photos...')
# verdict = agent('Is this a flood photo? ...')
