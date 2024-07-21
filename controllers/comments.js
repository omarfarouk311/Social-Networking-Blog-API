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

exports.deleteComment = async (req, res, next) => {
    const { user, post, comment } = req;
    try {
        await user.deleteComment(comment, post);
        return res.status(204).json({ message: 'Comment deleted successfully' });
    }
    catch (err) {
        return next(err);
    }
}

exports.updateComment = async (req, res, next) => {
    const { body, user, comment } = req;

    try {
        //request to updateLikes
        if (body.modifyLikes) {
            let updatedComment;
            if (body.value === 1) updatedComment = await user.likeComment(comment);
            else updatedComment = await user.unlikeComment(comment);

            return res.status(200).json({
                message: 'Likes updated successfully',
                ...updatedComment
            });
        }

        //otherwise, request to update comment data
        const update = { content: body.content };
        const updatedComment = await comment.updateComment({ _id: comment._id }, update);
        return res.status(200).json({
            message: 'Post updated successfully',
            ...updatedComment
        });
    }
    catch (err) {
        return next(err);
    }
}