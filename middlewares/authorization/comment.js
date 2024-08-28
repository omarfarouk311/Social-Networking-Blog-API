const Comment = require('../../models/comment');

function authorizeCommentModification(operation) {
    return async (req, res, next) => {
        const { commentId, postId } = req.params, { userId } = req;
        const projection = operation ? { _id: 1 } : { likingUsersIds: 1, parentsIds: 1 };

        try {
            const comment = await Comment.getComment({ creatorId: userId, postId }, projection);

            if (!comment) {
                const exist = await Comment.getComment({ postId, _id: commentId }, { _id: 1 });
                if (exist) {
                    return res.status(403).json({
                        message: (operation ? 'Unauthorized request to update the comment' : 'Unauthorized request to delete the comment')
                    });
                }
                return res.status(404).json({
                    message: 'Comment not found'
                });
            }

            req.comment = comment;
            return next();
        }
        catch (err) {
            return next(err);
        }
    };
}

exports.authorizeCommentDeletion = authorizeCommentModification(0);

exports.authorizeCommentUpdating = authorizeCommentModification(1);