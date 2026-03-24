const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const userId = req.user._id || req.user.id;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Group name and at least one member are required' 
      });
    }

    // Convert all IDs to ObjectId strings for consistency
    const userIdStr = userId.toString();
    const memberIdStrs = memberIds.map(id => id.toString());

    // Add creator to members if not already included
    const uniqueMembers = new Set([userIdStr, ...memberIdStrs]);
    const memberArray = Array.from(uniqueMembers).map(id => new mongoose.Types.ObjectId(id));

    // Verify all members exist
    const members = await User.find({ _id: { $in: memberArray } });
    if (members.length !== memberArray.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Some members do not exist' 
      });
    }

    const group = new Group({
      name,
      description: description || '',
      createdBy: new mongoose.Types.ObjectId(userIdStr),
      members: memberArray
    });

    await group.save();
    await group.populate('members', 'username email profilePicture');
    await group.populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating group', 
      error: error.message 
    });
  }
};

// Get all groups for a user
exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const groups = await Group.find({ 
      members: userId,
      isActive: true 
    })
      .populate('members', 'username email profilePicture status')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching groups', 
      error: error.message 
    });
  }
};

// Get a single group
exports.getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id || req.user.id;

    const group = await Group.findById(groupId)
      .populate('members', 'username email profilePicture status')
      .populate('createdBy', 'username email');

    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Check if user is a member
    const isMember = group.members.some(member => member._id.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a member of this group' 
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching group', 
      error: error.message 
    });
  }
};

// Update group
exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, groupPicture } = req.body;
    const userId = req.user._id || req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Only group creator can update group
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only group creator can update group' 
      });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (groupPicture) group.groupPicture = groupPicture;

    await group.save();
    await group.populate('members', 'username email profilePicture status');
    await group.populate('createdBy', 'username email');

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: group
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating group', 
      error: error.message 
    });
  }
};

// Add member to group
exports.addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: newMemberId } = req.body;
    const userId = req.user._id || req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Only group creator can add members
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only group creator can add members' 
      });
    }

    // Check if user already in group
    const newMemberIdStr = newMemberId.toString();
    const isMemberExists = group.members.some(member => member.toString() === newMemberIdStr);
    if (isMemberExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already in group' 
      });
    }

    group.members.push(new mongoose.Types.ObjectId(newMemberIdStr));
    await group.save();
    await group.populate('members', 'username email profilePicture status');

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      data: group
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding member', 
      error: error.message 
    });
  }
};

// Remove member from group
exports.removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: memberToRemove } = req.body;
    const userId = req.user._id || req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Only group creator can remove members
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only group creator can remove members' 
      });
    }

    const memberToRemoveStr = memberToRemove.toString();
    group.members = group.members.filter(member => member.toString() !== memberToRemoveStr);
    await group.save();
    await group.populate('members', 'username email profilePicture status');

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: group
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error removing member', 
      error: error.message 
    });
  }
};

// Leave group
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id || req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Check if user is member
    const userIdStr = userId.toString();
    const isMember = group.members.some(member => member.toString() === userIdStr);
    if (!isMember) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are not a member of this group' 
      });
    }

    group.members = group.members.filter(member => member.toString() !== userIdStr);
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error leaving group', 
      error: error.message 
    });
  }
};

// Delete group
exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id || req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Only group creator can delete group
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only group creator can delete group' 
      });
    }

    await Group.findByIdAndDelete(groupId);

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting group', 
      error: error.message 
    });
  }
};

// Get group messages
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id || req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Check if user is member
    const isMember = group.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a member of this group' 
      });
    }

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username profilePicture')
      .sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching group messages', 
      error: error.message 
    });
  }
};
