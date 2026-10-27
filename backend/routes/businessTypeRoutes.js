const express = require('express');
const { getActiveBusinessTypes } = require('../services/businessTypeService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const businessTypes = await getActiveBusinessTypes();
    return res.json({
      success: true,
      data: businessTypes.map(({ key, labels, icon, moduleKeys, sortOrder }) => ({
        key,
        labels,
        icon,
        moduleKeys: moduleKeys || [],
        sortOrder,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger les domaines d’activité.' });
  }
});

module.exports = router;