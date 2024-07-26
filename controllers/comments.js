const Comment = require('../models/comment');
const User = require('../models/user');

exports.getComments = async (req, res, next) => {
    try {
        const { lastId } = req.query, { post } = req;
        let filter = { postId: post._id };
        if (lastId) {
            filter._id = { $lt: lastId };
        }

        const comments = await Comment.getComments(filter)
            .sort({ _id: -1 })
            .limit(10)
            .toArray();

        let lastCommentId = null;
        if (comments.length) {
            await User.joinCommentsCreators(comments);
            lastCommentId = comments[comments.length - 1]['_id'].toString();
        }

        return res.status(200).json({
            message: 'Comments fetched successfully',
            comments,
            lastCommentId
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.createComment = async (req, res, next) => {
    const { content, parentId } = req.body, { user, post } = req;
    const comment = new Comment({
        content,
        creationDate: new Date(Date.now()).toISOString(),
        creatorId: user._id,
        postId: post._id,
        likes: 0,
        parentId,
        repliesCount: 0,
        likingUsersIds: []
    });

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
    const { post, comment } = req;
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
        const updatedComment = await comment.updateComment({ _id: comment._id }, body);
        return res.status(200).json({
            message: 'Post updated successfully',
            ...updatedComment
        });
    }
    catch (err) {
        return next(err);
    }
};