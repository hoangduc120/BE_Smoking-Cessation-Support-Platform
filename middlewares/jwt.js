const jwt = require("jsonwebtoken");

const generateToken = async (payload, secretSignature, tokenLife) => {
  try {
    return jwt.sign(payload, secretSignature, {
      algorithm: "HS256",
      expiresIn: tokenLife,
    });
  } catch (error) {
    throw new Error(error);
  }
};

const verifyToken = async (token, secretSignature) => {
  try {
    return jwt.verify(token, secretSignature);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
