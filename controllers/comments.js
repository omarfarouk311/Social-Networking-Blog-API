const { ObjectId } = require('mongodb');
const Comment = require('../models/comment');

exports.getComments = async (req, res, next) => {
    try {
        const { lastId } = req.query;
        let filter = {};
        if (lastId) {
            filter._id = { $gt: ObjectId.createFromHexString(lastId) };
        }

        const comments = await Comment.getComments(filter)
            .limit(10)
            .toArray();
        const lastCommentId = comments[comments.length - 1]['_id'].toString();

        return res.status(200).json({
            message: 'Comments fetched successfully',
            comments,
            lastCommentId
        });
    }
    catch (err) {
        return next(err);
    }
}

exports.createComment = async (req, res, next) => {
    const { content } = req.body, { user, post } = req;
    const comment = new Comment({
        content,
        creationDate: new Date(Date.now()).toISOString(),
        creatorId: user._id,
        likes: 0,
        postId
    });

    try {
        await user.addComment(comment, post);
        return res.status(201).json({
            message: 'Comment created successfully',
            ...comment
        });
    }
    catch (err) {
        return next(err);
    }
}