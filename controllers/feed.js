const Post = require('../models/post');

exports.getPosts = async (req, res, next) => {
    try {
        const { page = 1, itemsPerPage = 3 } = req.query;
        const totalPosts = await Post.countPosts();
        const posts = await Post.fetchPosts(page, itemsPerPage);
        return res.status(200).json({
            message: 'Posts fetched successfully',
            posts: posts,
            totalPosts: totalPosts
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const { post } = req;
    return res.status(200), json({
        message: 'Post fetched successfully',
        post: post
    });
};

exports.createPost = async (req, res, next) => {
    const post = new Post({
        ...req.body,
        creator: { name: 'Dummy' },
        createdAt: new Date(Date.now()).toISOString()
    });

    try {
        if (!req.file) {
            const err = new Error('No image provided');
            err.statusCode = 422;
            throw err;
        }
        post.imageUrl = req.file.path;
        await post.create();

        return res.status(201).json({
            message: 'Post created successfully!',
            post: post
        });
    }
    catch (err) {
        return next(err);
    }
};