#!/usr/bin/env node
/**
 * Build reproducible practice papers from FINDR's reviewed question bank.
 * No network, language model, or publisher question-paper content is used.
 * Run with --write to update the bank; otherwise check the committed output.
 */
import {readFile, writeFile, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const PAPER_COUNT = 10;
const QUESTION_COUNT = 60;
const DURATION_SECONDS = 3600;
const SEED = 'findr-fess-papers-0.39.1-v1';
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function randomFor(seed) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getFessPaperSections(bank) {
  if (!Array.isArray(bank.questions) || !Array.isArray(bank.quizzes)) {
    throw new Error('Questions and subject quizzes are required to balance the papers.');
  }
  const questionIds = new Set(bank.questions.map(question => question.id));
  if (questionIds.size !== bank.questions.length || questionIds.size < QUESTION_COUNT) {
    throw new Error('The bank needs unique question IDs and at least 60 questions.');
  }
  const grouped = new Map();
  const seen = new Set();
  for (const quiz of bank.quizzes) {
    if (!quiz.section || !Array.isArray(quiz.questionIds)) throw new Error('Invalid subject quiz.');
    const ids = grouped.get(quiz.section) ?? [];
    for (const id of quiz.questionIds) {
      if (!questionIds.has(id) || seen.has(id)) throw new Error(`Unknown or repeated subject question: ${id}`);
      seen.add(id);
      ids.push(id);
    }
    grouped.set(quiz.section, ids);
  }
  if (seen.size !== questionIds.size) throw new Error('Subject quizzes must cover the complete question bank exactly once.');
  const sections = [...grouped].map(([section, ids]) => ({
    section,
    questionIds: ids.sort(compare),
    quota: Math.floor(ids.length * QUESTION_COUNT / questionIds.size),
    remainder: (ids.length * QUESTION_COUNT) % questionIds.size,
  })).sort((a, b) => compare(a.section, b.section));
  const unassigned = QUESTION_COUNT - sections.reduce((total, item) => total + item.quota, 0);
  const order = [...sections].sort((a, b) => b.remainder - a.remainder || compare(a.section, b.section));
  for (let index = 0; index < unassigned; index++) order[index].quota++;
  for (const section of sections) {
    if (section.quota > section.questionIds.length || section.quota * PAPER_COUNT < section.questionIds.length) {
      throw new Error(`Cannot cover ${section.section} within the allocated ten-paper quota.`);
    }
  }
  return sections;
}

export function generateFessPapers(bank) {
  const sections = getFessPaperSections(bank);
  const usage = new Map(bank.questions.map(question => [question.id, 0]));
  const papers = [];
  for (let index = 0; index < PAPER_COUNT; index++) {
    const number = String(index + 1).padStart(2, '0');
    const selected = [];
    for (const section of sections) {
      const random = randomFor(`${SEED}:${number}:${section.section}`);
      const ranked = section.questionIds.map(id => ({id, used: usage.get(id), tie: random()}))
        .sort((a, b) => a.used - b.used || a.tie - b.tie || compare(a.id, b.id));
      for (const {id} of ranked.slice(0, section.quota)) {
        selected.push(id);
        usage.set(id, usage.get(id) + 1);
      }
    }
    papers.push({
      id: `paper-${number}`,
      title: `Paper ${number}`,
      questionIds: shuffle(selected, randomFor(`${SEED}:${number}:question-order`)),
      durationSeconds: DURATION_SECONDS,
      description: '60 mixed-subject questions from FINDR’s reviewed bank. Unofficial 60-minute practice; the cited current Highfield format allows 75 minutes.',
    });
  }
  const paperFormat = {
    questionCount: QUESTION_COUNT,
    durationSeconds: DURATION_SECONDS,
    officialDurationMinutes: 75,
    sourceUrl: 'https://assets-eu-01.kc-usercontent.com/c87d3310-963d-0197-1aa9-85c8c23ffbaf/f3f5d1d4-2987-4e72-8151-b32f730765b8/FESS%20-%20EPA%20Kit%20v5.0.pdf',
    sourcePdfPage: 53,
    checkedAt: '2026-11-12',
    edition: 'Highfield FESS EPA Kit v5.0 / ST0189 v1.2',
    description: 'Unofficial FINDR practice uses 60 questions and a user-requested 60-minute timer. The cited current Highfield EPA kit specifies 60 questions in 75 minutes. Confirm the standard version and assessment plan for your enrolled cohort with your provider. These mixed-subject papers are not official exam papers, a reproduction of Highfield’s assessment blueprint, or a prediction of an EPA grade.',
  };
  inspectFessPapers(bank, papers);
  return {papers, paperFormat};
}

export function inspectFessPapers(bank, papers) {
  const sections = getFessPaperSections(bank);
  const usage = Object.fromEntries(bank.questions.map(question => [question.id, 0]).sort(([a], [b]) => compare(a, b)));
  const signatures = new Set();
  if (papers.length !== PAPER_COUNT || new Set(papers.map(paper => paper.id)).size !== PAPER_COUNT) {
    throw new Error('Exactly ten uniquely identified papers are required.');
  }
  for (const paper of papers) {
    if (paper.questionIds.length !== QUESTION_COUNT || new Set(paper.questionIds).size !== QUESTION_COUNT) {
      throw new Error(`${paper.id} must contain 60 unique questions.`);
    }
    if (paper.durationSeconds !== DURATION_SECONDS) throw new Error(`${paper.id} has the wrong practice duration.`);
    const included = new Set(paper.questionIds);
    const signature = [...included].sort(compare).join(',');
    if (signatures.has(signature)) throw new Error('Two papers have identical question sets.');
    signatures.add(signature);
    for (const id of included) {
      if (!Object.hasOwn(usage, id)) throw new Error(`Unknown paper question ${id}.`);
      usage[id]++;
    }
    for (const section of sections) {
      if (section.questionIds.filter(id => included.has(id)).length !== section.quota) {
        throw new Error(`${paper.id} does not match the ${section.section} quota.`);
      }
    }
  }
  if (Object.values(usage).some(count => count === 0)) throw new Error('Some bank questions never appear in a paper.');
  for (const section of sections) {
    const counts = section.questionIds.map(id => usage[id]);
    if (Math.max(...counts) - Math.min(...counts) > 1) throw new Error('Question reuse is not balanced within a section.');
  }
  const overlaps = [];
  for (let i = 0; i < papers.length; i++) {
    const first = new Set(papers[i].questionIds);
    for (let j = i + 1; j < papers.length; j++) {
      overlaps.push({papers: [papers[i].id, papers[j].id], count: papers[j].questionIds.filter(id => first.has(id)).length});
    }
  }
  const usageHistogram = {};
  for (const count of Object.values(usage)) usageHistogram[count] = (usageHistogram[count] ?? 0) + 1;
  return {
    paperCount: papers.length,
    questionCountPerPaper: QUESTION_COUNT,
    totalPlacements: Object.values(usage).reduce((a, b) => a + b, 0),
    uniqueQuestionsCovered: Object.values(usage).filter(count => count > 0).length,
    quotas: Object.fromEntries(sections.map(section => [section.section, section.quota])),
    usageHistogram,
    overlapMinimum: Math.min(...overlaps.map(pair => pair.count)),
    overlapMaximum: Math.max(...overlaps.map(pair => pair.count)),
    overlapMean: overlaps.reduce((sum, pair) => sum + pair.count, 0) / overlaps.length,
    overlaps,
    questionUsage: usage,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let bankPath = fileURLToPath(new URL('../public/app/data/fess-mocks.json', import.meta.url));
  let mode = 'check';
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--bank' && args[index + 1]) bankPath = path.resolve(args[++index]);
    else if (['--write', '--check', '--summary'].includes(argument)) mode = argument.slice(2);
    else throw new Error(`Unknown or incomplete argument: ${argument}`);
  }
  const original = await readFile(bankPath, 'utf8');
  const bank = JSON.parse(original);
  const generated = generateFessPapers(bank);
  if (mode === 'write') {
    if (await readFile(bankPath, 'utf8') !== original) throw new Error('The bank changed while generating; retry against the latest file.');
    const temporaryPath = `${bankPath}.papers-${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify({...bank, ...generated}, null, 2) + '\n');
    await rename(temporaryPath, bankPath);
  } else if (mode === 'check' && (
    JSON.stringify(bank.papers) !== JSON.stringify(generated.papers) ||
    JSON.stringify(bank.paperFormat) !== JSON.stringify(generated.paperFormat)
  )) {
    throw new Error('Committed papers differ from deterministic output. Run with --write to update them.');
  }
  console.log(JSON.stringify({mode, ...inspectFessPapers(bank, generated.papers)}, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
