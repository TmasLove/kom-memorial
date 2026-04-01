const express = require('express');
const { getUserKoms } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const now = new Date();

    const activeKoms = (await getUserKoms(userId, 'active')).map(kom => {
      const got = new Date(kom.got_date + 'T12:00:00Z');
      const daysHeld = Math.max(0, Math.round((now - got) / (1000 * 60 * 60 * 24)));
      return { ...kom, daysHeld };
    });

    const memorialisedKoms = (await getUserKoms(userId, 'memorialized')).map(kom => {
      const got = new Date(kom.got_date + 'T12:00:00Z');
      const lost = new Date(kom.lost_date + 'T12:00:00Z');
      const daysHeld = Math.max(0, Math.round((lost - got) / (1000 * 60 * 60 * 24)));
      return { ...kom, daysHeld };
    });

    res.render('dashboard', {
      title: 'Dashboard',
      activeKoms,
      memorialisedKoms,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
