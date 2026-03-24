/**
 * Generates a funny auto-drafted KOM obituary from a template.
 * The user can edit the result before saving.
 */

const TEMPLATES = [
  ({ username, segmentName, gotDate, lostDate, newHolder, daysHeld }) =>
    `Here lies the KOM on ${segmentName}, held with iron legs and zero mercy by ${username}. ` +
    `From ${fmtDate(gotDate)} to ${fmtDate(lostDate)} — ${daysHeld} glorious days — this segment ` +
    `trembled at the sound of their tyres. Then ${newHolder || 'a mystery rider'} showed up, ` +
    `presumably on a closed road with a tailwind and fresh legs from a two-week holiday. ` +
    `Gone, but not forgotten. The Strava crown lives on in our hearts.`,

  ({ username, segmentName, gotDate, lostDate, newHolder, daysHeld }) =>
    `After ${daysHeld} days of unopposed dominance, the reign of ${username} over ` +
    `${segmentName} has officially ended. ${newHolder || 'Some anonymous cyclist'} apparently ` +
    `decided that ${username}'s suffering wasn't enough, and went and did it faster. ` +
    `Born: ${fmtDate(gotDate)}. Died: ${fmtDate(lostDate)}. Cause of death: someone else's lunch ride.`,

  ({ username, segmentName, gotDate, lostDate, newHolder, daysHeld }) =>
    `IN LOVING MEMORY of ${username}'s KOM on ${segmentName}. ` +
    `It stood proudly from ${fmtDate(gotDate)} until ${fmtDate(lostDate)}, ` +
    `a total of ${daysHeld} days — each one a testament to human suffering and overpriced carbon fibre. ` +
    `${newHolder || 'The new holder'} has taken the crown. We wish them well. ` +
    `We also hope they get a flat tyre on their next ride. (We don't mean that.) ` +
    `(We absolutely mean that.)`,

  ({ username, segmentName, gotDate, lostDate, newHolder, daysHeld }) =>
    `The KOM gods giveth, and the KOM gods taketh away. For ${daysHeld} days, ` +
    `${username} ruled ${segmentName} like a climbing monarch. ` +
    `${newHolder || 'Another rider'} came along on ${fmtDate(lostDate)} and ruined everything. ` +
    `They will not be forgiven. The segment will be avenged. But probably not today — ` +
    `${username}'s legs are a bit tired.`,

  ({ username, segmentName, gotDate, lostDate, newHolder, daysHeld }) =>
    `R.I.P. ${username}'s ${segmentName} KOM (${fmtDate(gotDate)} – ${fmtDate(lostDate)}). ` +
    `Age: ${daysHeld} days. Survived by: a bitter Strava notification, ` +
    `one very expensive power meter, and a diet that was definitely worth it. ` +
    `${newHolder ? `Usurped by ${newHolder}, who will themselves be usurped in due course.` : 'The new holder is currently unknown. The suspense is killing us.'} ` +
    `Donations in lieu of flowers can be made to buying a lighter wheelset.`,
];

function fmtDate(dateStr) {
  if (!dateStr) return '(unknown)';
  const d = new Date(dateStr + 'T12:00:00Z'); // avoid timezone shifts
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function generateObituary({ username, segmentName, gotDate, lostDate, newHolder }) {
  const got = new Date(gotDate + 'T12:00:00Z');
  const lost = new Date(lostDate + 'T12:00:00Z');
  const daysHeld = Math.max(0, Math.round((lost - got) / (1000 * 60 * 60 * 24)));

  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  return template({ username, segmentName, gotDate, lostDate, newHolder, daysHeld });
}

module.exports = { generateObituary, fmtDate };
