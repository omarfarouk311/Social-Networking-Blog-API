const Comment = require('../models/comment');
const User = require('../models/user');
const DatabaseFacade = require('../models/database facade');

exports.getComments = async (req, res, next) => {
    const { lastId, parentId } = req.query, { userId } = req, { postId } = req.params;
    const filter = { postId, parentId };
    if (lastId) {
        filter._id = { $lt: lastId };
    }

    try {
        const result = await Comment.getCommentsInfo(filter, userId);
        return res.status(200).json({
            message: 'Comments fetched successfully',
            ...result
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.createComment = async (req, res, next) => {
    const { userId } = req, { postId } = req.params, { content, parentId } = req.body;

    try {
        const parentsIds = [];
        if (parentId) {
            const { parentsIds: parentParentsIds } = await Comment.getComment({ _id: parentId }, { parentsIds: 1, _id: 0 });
            parentsIds.push(...parentParentsIds, parentId);
        }

        const comment = new Comment({
            content,
            parentsIds,
            parentId,
            creationDate: new Date(Date.now()),
            creatorId: userId,
            postId,
            likes: 0,
            repliesCount: 0,
            likingUsersIds: []
        });

        await comment.createComment(postId);
        return res.status(201).json({
            message: 'Comment created successfully',
            ...comment
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.deleteComment = async (req, res, next) => {
    const { comment } = req, { postId } = req.params;

    try {
        await DatabaseFacade.deleteComment({ ...comment, postId });
        return res.status(204).json({ message: 'Comment deleted successfully' });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateComment = async (req, res, next) => {
    const { body, comment } = req;

    try {
        const projection = { _id: 0 };
        for (const key in body) {
            projection[key] = 1;
        }

        const updatedComment = await Comment.findAndUpdateComment({ _id: comment._id }, { $set: body }, projection);
        return res.status(200).json({
            message: 'Post updated successfully',
            ...updatedComment
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getCommentsLikers = async (req, res, next) => {
    const { comment } = req, { page = 0 } = req.query;

    try {
        const users = await Comment.getCommentLikers(page, comment._id);
        return res.status(200).json({
            message: 'Post likers fetched successfully',
            users
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateCommentLikes = async (req, res, next) => {
    const { userId, comment } = req, { action } = req.body;
    let updatedComment;

    try {
        if (action === 1) {
            updatedComment = await User.likeComment(userId, comment._id);
            if (!updatedComment) {
                const err = new Error('Comment already liked');
                err.statusCode = 409;
                throw err;
            }
        }
        else {
            updatedComment = await User.unlikeComment(userId, comment._id);
            if (!updatedComment) {
                const err = new Error("Comment isn't liked");
                err.statusCode = 409;
                throw err;
            }
        }

        return res.status(200).json({
            message: 'Likes updated successfully',
            ...updatedComment
        });
    }
    catch (err) {
        return next(err);
    }
};
