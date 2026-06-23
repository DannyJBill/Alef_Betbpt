import { LETTER_GROUPS, ALL_LETTERS } from '../data/alphabet';

export function getGroupLetters(groupId) {
  const group = LETTER_GROUPS.find(g => g.id === groupId);
  if (!group) return [];
  return ALL_LETTERS.filter(l => group.letterIds.includes(l.id));
}

export function isGroupUnlocked(groupId, groupProgress) {
  return groupProgress?.[groupId] !== 'locked';
}

export function getGroupMastery(groupId, cardReviews) {
  const letters = getGroupLetters(groupId);
  if (!letters.length) return 0;
  const known = letters.filter(l => {
    const r = cardReviews?.[l.id];
    return r && r.repetitions > 0;
  }).length;
  return Math.round((known / letters.length) * 100);
}

export const GROUP_COLORS = {
  emerald: { bg:'bg-emerald-50 dark:bg-emerald-950', text:'text-emerald-700 dark:text-emerald-300', border:'border-emerald-200 dark:border-emerald-800', fill:'bg-emerald-500' },
  blue:    { bg:'bg-blue-50 dark:bg-blue-950',       text:'text-blue-700 dark:text-blue-300',       border:'border-blue-200 dark:border-blue-800',       fill:'bg-blue-500' },
  amber:   { bg:'bg-amber-50 dark:bg-amber-950',     text:'text-amber-700 dark:text-amber-300',     border:'border-amber-200 dark:border-amber-800',     fill:'bg-amber-500' },
  rose:    { bg:'bg-rose-50 dark:bg-rose-950',       text:'text-rose-700 dark:text-rose-300',       border:'border-rose-200 dark:border-rose-800',       fill:'bg-rose-500' },
  purple:  { bg:'bg-purple-50 dark:bg-purple-950',   text:'text-purple-700 dark:text-purple-300',   border:'border-purple-200 dark:border-purple-800',   fill:'bg-purple-500' },
};
