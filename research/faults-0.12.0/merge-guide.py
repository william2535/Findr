"""Merge the reviewed 0.12.0 fault fragments without replacing saved answer IDs."""
from pathlib import Path
import copy
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
TARGET = ROOT / 'public/app/data/knowledge.json'
FRAGMENTS = ['fire-fragment.json', 'security-warden-fragment.json', 'access-cctv-fragment.json']

guide = json.loads(TARGET.read_text())
previous = {group['id']: group for group in guide['groups']}
updates = {}
sources = {}
scenarios = []


def add_source(source, replace=False):
    source = copy.deepcopy(source)
    source.pop('searchRef', None)
    source.pop('webRef', None)
    key = source['id']
    if key in sources:
        assert sources[key]['url'] == source['url'], f'Conflicting source URL: {key}'
    if replace or key not in sources:
        sources[key] = source


for source in guide['sources']:
    add_source(source)

for filename in FRAGMENTS:
    fragment = json.loads((HERE / filename).read_text())
    for source in fragment['sources']:
        add_source(source, replace=True)
    for group in fragment['groups']:
        assert group['id'] not in updates, f'Duplicate group: {group["id"]}'
        if group['id'] in previous:
            old = previous[group['id']]
            assert group['category'] == old['category'], group['id']
            questions = {question['id']: question for question in group['questions']}
            for question in old['questions']:
                assert question['id'] in questions, f'Lost saved question: {group["id"]}/{question["id"]}'
                assert questions[question['id']]['text'] == question['text'], f'Changed saved question meaning: {group["id"]}/{question["id"]}'
            assert {cause['id'] for cause in old['causes']} <= {cause['id'] for cause in group['causes']}, group['id']
        for cause in group['causes']:
            cause.setdefault('status', 'hypothesis')
            for source in cause['sources']:
                source.pop('searchRef', None)
                source.pop('webRef', None)
                add_source(source)
        for question in group['questions']:
            question['hint'] = question['hint'].replace('“Don’t know”', '“I don’t know”').replace('"Don’t know"', '"I don’t know"')
        updates[group['id']] = group
    scenarios.extend(fragment['scenarios'])

# Fragments own full category groups. A missing old group must never disappear.
groups = [updates.pop(group['id'], group) for group in guide['groups']]
groups.extend(updates.values())
category_order = {'fire': 0, 'security': 1, 'access-control': 2, 'cctv': 3, 'warden-call': 4}
groups.sort(key=lambda group: category_order[group['category']])
for group in groups:
    for question in group['questions']:
        assert question.get('sourceRefs'), f'Question needs provenance: {group["id"]}/{question["id"]}'
        for ref in question['sourceRefs']:
            assert ref['sourceId'] in sources, ref['sourceId']

guide.update({
    'schemaVersion': 2,
    'version': '0.12.0',
    'reviewedOn': '2026-10-30',
    'name': 'FINDR fire and security observation guide',
    'answerOptions': [
        {'id': 'yes', 'label': 'Yes', 'evidence': 1},
        {'id': 'no', 'label': 'No', 'evidence': -1},
        {'id': 'unknown', 'label': 'I don’t know', 'evidence': 0},
    ],
    'groups': groups,
    'sources': sorted(sources.values(), key=lambda source: source['id']),
})
guide['engineGuidance']['update'] = 'Yes multiplies by p; No by 1-p. I don’t know makes no change to candidate weights. Recompute from original answers when undoing an answer. Only valid answers to questions in the selected group count as evidence.'
guide['engineGuidance']['legacyAnswers'] = 'Older saved Probably / Probably not answers retain their original half-strength weight and are labelled as earlier-session answers. They are not offered in new questions and are never silently strengthened into Yes / No.'

TARGET.write_text(json.dumps(guide, ensure_ascii=False, indent=2) + '\n')
(HERE / 'scenarios.json').write_text(json.dumps(scenarios, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({
    'groups': len(groups),
    'questions': sum(len(group['questions']) for group in groups),
    'causes': sum(len(group['causes']) for group in groups),
    'sources': len(sources),
    'scenarios': len(scenarios),
    'categories': {category: sum(group['category'] == category for group in groups) for category in category_order},
}, indent=2))
