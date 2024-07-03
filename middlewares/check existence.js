const Post = require('../models/post');

exports.checkPostExistence = async (req, res, next) => {
    const { postId } = req.params;
    try {
        let post;
        if (postId.length === 24) {
            post = await Post.fetchPost(postId);
        }

        if (!post) {
            const err = new Error('Post not found');
            err.statusCode = 404;
            throw err;
        }

        req.post = new Post(post);
        return next();
    }
    catch (err) {
        return next(err);
    }
};