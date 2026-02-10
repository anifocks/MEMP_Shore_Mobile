// viswa-digital-backend/team-service/models/teamModel.js
import sql from 'mssql';
import { getPool } from '../utils/db.js';

class TeamModel {
  static async executeQuery(query, inputs = [], operation = 'unspecified') {
    try {
      const pool = getPool();
      const request = pool.request();
      if (inputs.length > 0) {
        inputs.forEach(input => {
          request.input(input.name, input.type, input.value);
        });
      }
      const result = await request.query(query);
      return result;
    } catch (error) {
      console.error(`[DB] Error in operation '${operation}':`, error.message);
      throw error;
    }
  }

  static async getAllTeamMembers() {
    // Include the new 'Introduction' column in the SELECT query
    const query = 'SELECT Team_Id, Member_Name, Role, Email, Rights, ImageFilename, IsActive, Introduction FROM dbo.Viswa_Digital_Team ORDER BY IsActive DESC, Team_Id ASC;';
    const result = await this.executeQuery(query, [], 'GetAllTeamMembers');
    return result.recordset;
  }

  static async addTeamMember(memberData) {
    const { Member_Name, Role, Email, Rights = null, ImageFilename = 'default-member.png', Introduction = null } = memberData;
    if (!Member_Name || !Role || !Email) {
      throw new Error('Member Name, Role, and Email are required fields.');
    }
    const query = `
      INSERT INTO dbo.Viswa_Digital_Team (Member_Name, Role, Email, Rights, ImageFilename, IsActive, Introduction)
      OUTPUT Inserted.*
      VALUES (@Member_Name, @Role, @Email, @Rights, @ImageFilename, 1, @Introduction);
    `;
    const inputs = [
      { name: 'Member_Name', type: sql.NVarChar, value: Member_Name },
      { name: 'Role', type: sql.NVarChar, value: Role },
      { name: 'Email', type: sql.NVarChar, value: Email },
      { name: 'Rights', type: sql.Int, value: Rights },
      { name: 'ImageFilename', type: sql.NVarChar, value: ImageFilename },
      { name: 'Introduction', type: sql.NVarChar(sql.MAX), value: Introduction }, // Use NVarChar(MAX) for potentially long text
    ];
    const result = await this.executeQuery(query, inputs, 'AddTeamMember');
    return result.recordset[0];
  }

  static async getTeamMemberById(memberId) {
    // Include the new 'Introduction' column in the SELECT query
    const query = 'SELECT Team_Id, Member_Name, Role, Email, Rights, ImageFilename, IsActive, Introduction FROM dbo.Viswa_Digital_Team WHERE Team_Id = @memberId;';
    const inputs = [{ name: 'memberId', type: sql.Int, value: memberId }];
    const result = await this.executeQuery(query, inputs, 'GetTeamMemberById');
    return result.recordset[0];
  }

  static async deactivateTeamMember(memberId) {
    const query = 'UPDATE dbo.Viswa_Digital_Team SET IsActive = 0 WHERE Team_Id = @memberId;';
    const inputs = [{ name: 'memberId', type: sql.Int, value: memberId }];
    await this.executeQuery(query, inputs, 'DeactivateTeamMember');
  }

  // New function to reactivate a user
  static async reactivateTeamMember(memberId) {
    const query = 'UPDATE dbo.Viswa_Digital_Team SET IsActive = 1 WHERE Team_Id = @memberId;';
    const inputs = [{ name: 'memberId', type: sql.Int, value: memberId }];
    await this.executeQuery(query, inputs, 'ReactivateTeamMember');
  }

  // New function to update team member introduction
  static async updateTeamMemberIntroduction(memberId, introduction) {
    const query = 'UPDATE dbo.Viswa_Digital_Team SET Introduction = @introduction WHERE Team_Id = @memberId;';
    const inputs = [
      { name: 'memberId', type: sql.Int, value: memberId },
      { name: 'introduction', type: sql.NVarChar(sql.MAX), value: introduction }, // Use NVarChar(MAX) for potentially long text
    ];
    await this.executeQuery(query, inputs, 'UpdateTeamMemberIntroduction');
  }

  // NEW: Function to update only the ImageFilename
  static async updateTeamMemberImageFilename(memberId, newFilename) {
    const query = 'UPDATE dbo.Viswa_Digital_Team SET ImageFilename = @newFilename WHERE Team_Id = @memberId;';
    const inputs = [
      { name: 'memberId', type: sql.Int, value: memberId },
      { name: 'newFilename', type: sql.NVarChar(255), value: newFilename }, // Assuming max length for filename
    ];
    await this.executeQuery(query, inputs, 'UpdateTeamMemberImageFilename');
  }
}

export default TeamModel;