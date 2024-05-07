const jwt = require('jsonwebtoken');
// const config = require('config');
const jwtPrivateKey = 'secret';
module.exports = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).send({
      message: 'Access denied. No token provided.',
    });
  }

  try {
    // const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
    const decoded = jwt.verify(token, jwtPrivateKey);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send({
      message: 'Invalid token.',
    });
  }
};
