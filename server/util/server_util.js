import axios from 'axios';
// Validate API requests
export const validateRequest = (req, res, next) => {
  console.debug("validating request");
  if (!true) {
    // Validation didn't pass
    throw({ status: 401, message: "Validation failed" });
  }
  next();
};

const getSiteMap = async (siteMapUrl) => {
  // Log Request Statistics
  // TODO: Logic to pull from cache
  try {
    const res = await axios.get(siteMapUrl);
    if(res.status === 200){
      return res.data;
    }
  } catch (e) {
    throw(e);
  }
}
