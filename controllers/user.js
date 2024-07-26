exports.updatePostLikes = async (req, res, next) => {
    const { user, post, body } = req;
    let updatedPost;

    try {
        if (body.value === 1) updatedPost = await user.likePost(post)[1];
        else updatedPost = await user.unlikePost(post)[1];

        return res.status(200).json({
            message: 'Likes updated successfully',
            ...updatedPost
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.updateCommentLikes = async (req, res, next) => {
    const { body, user, comment } = req;
    let updatedComment;

    try {
        if (body.value === 1) updatedComment = await user.likeComment(comment)[1];
        else updatedComment = await user.unlikeComment(comment)[1];

        return res.status(200).json({
            message: 'Likes updated successfully',
            ...updatedComment
        });
    }
    catch (err) {
        return next(err);
    }
};