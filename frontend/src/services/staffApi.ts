import api from './api';

// Staff API functions
export const getStaffList = async () => {
    const response = await api.get('/staff');
    return response.data;
};

export const createStaffMember = async (name: string) => {
    const response = await api.post('/staff', { name });
    return response.data;
};

export const updateStaffName = async (id: string, name: string) => {
    const response = await api.put(`/staff/${id}`, { name });
    return response.data;
};

export const updateStaffBottles = async (id: string, bottleData: { Large_bottles?: number; Small_bottles?: number }) => {
    const response = await api.patch(`/staff/${id}/bottles`, bottleData);
    return response.data;
};

export const deleteStaffMember = async (id: string) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
};

export const resetAllStaffBottles = async () => {
    const response = await api.post('/staff/reset-bottles');
    return response.data;
};