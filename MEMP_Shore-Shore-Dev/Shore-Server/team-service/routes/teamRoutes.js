// viswa-digital-backend/team-service/routes/teamRoutes.js
import express from 'express';
import * as teamController from '../controllers/teamController.js';
import { uploadMemberImage } from '../utils/fileUtils.js';

const router = express.Router();

// Middleware to parse JSON bodies for specific routes
const jsonParser = express.json();

router.get('/', teamController.getAllTeamMembers);
// Apply jsonParser specifically to the addTeamMember route
router.post('/', jsonParser, teamController.addTeamMember);
router.get('/:memberId', teamController.getTeamMemberById);

// This new route will handle both text and file uploads for a team member
router.put('/:memberId', uploadMemberImage.single('memberImage'), teamController.updateTeamMember);

router.put('/:memberId/deactivate', teamController.deactivateTeamMember);

// New route for reactivation
router.put('/:memberId/reactivate', teamController.reactivateTeamMember);

// Apply jsonParser specifically to the updateTeamMemberIntroduction route
router.put('/:memberId/introduction', jsonParser, teamController.updateTeamMemberIntroduction);

// Route for updating team member image - Multer handles its own body parsing
router.put('/:memberId/image', uploadMemberImage.single('memberImage'), teamController.updateTeamMemberImage);

export default router;