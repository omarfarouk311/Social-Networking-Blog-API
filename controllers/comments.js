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