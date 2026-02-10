// viswa-digital-backend/team-service/controllers/teamController.js
import TeamModel from '../models/teamModel.js';
import { deleteFile } from '../utils/fileUtils.js'; // Import deleteFile utility

export const getAllTeamMembers = async (req, res, next) => {
    try {
        const teamMembers = await TeamModel.getAllTeamMembers();
        res.status(200).json(teamMembers);
    } catch (error) {
        next(error);
    }
};

export const addTeamMember = async (req, res, next) => {
    try {
        const newMember = await TeamModel.addTeamMember(req.body);
        res.status(201).json({ message: 'Team member added successfully', data: newMember });
    } catch (error) {
        next(error);
    }
};

export const getTeamMemberById = async (req, res, next) => {
    try {
        const { memberId } = req.params;
        const member = await TeamModel.getTeamMemberById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }
        res.status(200).json(member);
    } catch (error) {
        next(error);
    }
};

export const deactivateTeamMember = async (req, res, next) => {
    try {
        const { memberId } = req.params;
        await TeamModel.deactivateTeamMember(memberId);
        res.status(200).json({ message: 'Team member deactivated successfully' });
    } catch (error) {
        next(error);
    }
};

// New controller function for reactivation
export const reactivateTeamMember = async (req, res, next) => {
    try {
        const { memberId } = req.params;
        await TeamModel.reactivateTeamMember(memberId);
        res.status(200).json({ message: 'Team member reactivated successfully' });
    } catch (error) {
        next(error);
    }
};

// New controller function to update team member introduction
export const updateTeamMemberIntroduction = async (req, res, next) => {
    try {
        const { memberId } = req.params;
        const { introduction } = req.body;

        if (typeof introduction !== 'string') {
            return res.status(400).json({ message: 'Introduction must be a string.' });
        }

        await TeamModel.updateTeamMemberIntroduction(memberId, introduction);
        res.status(200).json({ message: 'Team member introduction updated successfully' });
    } catch (error) {
        next(error);
    }
};

// NEW: Controller function to handle image upload and update
export const updateTeamMemberImage = async (req, res, next) => {
    try {
        const { memberId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded.' });
        }

        const newFilename = req.file.filename;

        // Get the current image filename from the database before updating
        const member = await TeamModel.getTeamMemberById(memberId);
        const oldFilename = member ? member.ImageFilename : null;

        // Update the database with the new filename
        await TeamModel.updateTeamMemberImageFilename(memberId, newFilename);

        // Delete the old file from storage if it exists and is not the default
        if (oldFilename && oldFilename !== 'default-member.png') {
            await deleteFile(oldFilename);
        }

        res.status(200).json({ message: 'Team member image updated successfully', newImageFilename: newFilename });

    } catch (error) {
        console.error("[CONTROLLER] Error updating team member image:", error);
        // Handle multer-specific errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'File size too large. Max 5MB allowed.' });
        }
        next(error); // Pass other errors to the error handling middleware
    }
};

export const updateTeamMember = async (req, res, next) => {
    try {
        const { memberId } = req.params;
        const { introduction } = req.body;

        // Update the introduction if it was provided
        if (introduction) {
            await TeamModel.updateTeamMemberIntroduction(memberId, introduction);
        }

        // Handle the file upload if a new image was provided
        if (req.file) {
            const newFilename = req.file.filename;
            const member = await TeamModel.getTeamMemberById(memberId);
            const oldFilename = member ? member.ImageFilename : null;

            await TeamModel.updateTeamMemberImageFilename(memberId, newFilename);

            if (oldFilename && oldFilename !== 'default-member.png') {
                await deleteFile(oldFilename);
            }
        }

        const updatedMember = await TeamModel.getTeamMemberById(memberId);
        res.status(200).json({ message: 'Team member updated successfully', data: updatedMember });

    } catch (error) {
        next(error);
    }
};