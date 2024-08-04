const Comment = require('../models/comment');
const Post = require('../models/post');

exports.getComments = async (req, res, next) => {
    const { lastId } = req.query, { userId } = req, { postId } = req.params;
    const filter = { postId };
    if (lastId) {
        filter._id = { $lt: lastId };
    }

    try {
        const result = await Comment.getComments(filter, userId, true);
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
    const { body, userId } = req, { postId } = req.params;
    const comment = new Comment({
        ...body,
        creationDate: new Date(Date.now()).toISOString(),
        creatorId: userId,
        postId,
        likes: 0,
        repliesCount: 0,
        likingUsersIds: []
    });
    const post = new Post({ _id: postId });

    try {
        await comment.createComment(post);
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
    const post = new Post({ _id: postId });

    try {
        await comment.deleteComment({ _id: comment._id }, post);
        return res.status(204).json({ message: 'Comment deleted successfully' });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateComment = async (req, res, next) => {
    const { body, comment } = req;
    if (!Object.keys(body).length) {
        return res.status(400).json({ message: 'Bad request' });
    }

    try {
        const updatedComment = await comment.updateComment({ _id: comment._id }, { $set: body });
        return res.status(200).json({
            message: 'Post updated successfully',
            ...updatedComment
        });
    }
    catch (err) {
        return next(err);
    }
};