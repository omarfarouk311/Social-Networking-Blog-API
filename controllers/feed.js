const Post = require('../models/post');

exports.getPosts = async (req, res, next) => {
    try {
        const posts = await Post.fetchPosts();
        return res.status(200).json({
            message: 'Posts fetched successfully',
            posts: posts
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.createPost = async (req, res, next) => {
    const post = new Post({
        ...req.body,
        creator: 'Dummy',
        createdAt: new Date(Date.now()).toISOString()
    });

    try {
        if (!req.file) {
            const err = new Error('No image provided');
            err.statusCode = 422;
            throw err;
        }

        this.imageUrl = req.file.path;
        await post.create();

        return res.status(201).json({
            message: 'Created successfully!',
            post: post
        });
    }
    catch (err) {
        return next(err);
    }
};

