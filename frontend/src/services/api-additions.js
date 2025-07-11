// Add these functions to your existing api.js file

/**
 * Get water bottle usage statistics for all staff members
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} - Array of staff water bottle usage data
 */
export const getWaterBottleUsage = async (startDate, endDate) => {
    try {
        const response = await axios.get(`${API_URL}/api/reports/water-bottle-usage`, {
            params: { startDate, endDate },
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

/**
 * Get recent water bottle usage for a specific staff member
 * @param {string} staffId - Staff ID
 * @returns {Promise<Array>} - Array of recent water bottle purchases
 */
export const getStaffWaterBottleUsage = async (staffId) => {
    try {
        const response = await axios.get(`${API_URL}/api/reports/staff/${staffId}/water-bottle-usage`, {
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};
