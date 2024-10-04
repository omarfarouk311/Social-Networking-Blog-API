const Comment = require('../models/comment');
const User = require('../models/user');
const DatabaseFacade = require('../models/database facade');

exports.getComments = async (req, res, next) => {
    const { lastId, parentId = null } = req.query, { userId } = req, { postId } = req.params;
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
    const { userId } = req, { postId } = req.params, { content, parentId = null } = req.body;

    try {
        const parentsIds = [];
        if (parentId) {
            const { parentsIds: parentParentsIds } = await Comment.getComment({ _id: parentId }, { parentsIds: 1, _id: 0 });
            parentsIds.unshift(parentId, ...parentParentsIds);
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

        delete comment.likingUsersIds;
        delete comment.parentsIds;
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
        return res.status(204).send();
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

        const updatedComment = await Comment.findAndUpdateComment(
            { _id: comment._id },
            { $set: body },
            { projection, returnDocument: 'after' }
        );

        return res.status(200).json({
            message: 'Comment updated successfully',
            ...updatedComment
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getCommentsLikers = async (req, res, next) => {
    const { comment } = req, { page = 1 } = req.query;

    try {
        const users = await Comment.getCommentLikers(page, comment._id);
        return res.status(200).json({
            message: 'Comment likers fetched successfully',
            users,
            page
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateCommentLikes = async (req, res, next) => {
    const { userId, comment } = req, { action } = req.body;
    let likes;

    try {
        if (action === 1) {
            likes = await User.likeComment(userId, comment._id);
            if (likes === null) {
                const err = new Error('Comment already liked');
                err.statusCode = 409;
                throw err;
            }
        }
        else {
            likes = await User.unlikeComment(userId, comment._id);
            if (likes === null) {
                const err = new Error("Comment isn't liked");
                err.statusCode = 409;
                throw err;
            }
        }

        return res.status(200).json({
            message: action === 1 ? 'Comment liked successfully' : 'Comment unliked successfully',
            likes
        });
    }
    catch (err) {
        return next(err);
    }
};
