const Post = require('../models/post');
const User = require('../models/user');
const Comment = require('../models/comment');

exports.getPosts = async (req, res, next) => {
    try {
        const { lastId } = req.query;
        let filter = {};
        if (lastId) {
            filter._id = { $lt: lastId };
        }

        const posts = await Post.getPosts(filter)
            .sort({ _id: -1 })
            .limit(10)
            .project({ content: 0, imagesUrls: 0 })
            .toArray();

        await User.joinCreators(posts);
        const lastPostId = posts[posts.length - 1]['_id'].toString();

        return res.status(200).json({
            message: 'Posts fetched successfully',
            posts,
            lastPostId
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const { post } = req;

    await Comment.joinComments(post);
    await User.joinCommentsCreators(post.comments);

    return res.status(200).json({
        message: 'Post fetched successfully',
        ...post
    });
};

exports.createPost = async (req, res, next) => {
    const { title, content } = req.body, { user } = req;
    const post = new Post({
        title,
        content,
        creatorId: user._id,
        creationDate: new Date(Date.now()).toISOString(),
        tags: [],
        commentsIds: [],
        likes: 0,
        bookmarkingUsersIds: [],
        likingUsersIds: [],
        commentsCount: 0
    });

    try {
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }

        post.imagesUrls = [];
        if (req.files) {
            req.files.forEach(file => post.imagesUrls.push(file.path));
        }
        await user.createPost(post);

        return res.status(201).json({
            message: 'Post created successfully!',
            ...post
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    const { post } = req;
    try {
        await post.deletePost({ _id: post._id });
        return res.status(204).json({ message: 'Post deleted successfully' });
    }
    catch (err) {
        return next(err);
    }
}

exports.updateLikes = async (req, res, next) => {
    const { user, post, body } = req;

    if (body.modifyLikes) {
        let updatedPost;
        if (body.value === 1) updatedPost = await user.likePost(post)[1];
        else updatedPost = await user.unlikePost(post)[1];

        return res.status(200).json({
            message: 'Likes updated successfully',
            ...updatedPost
        });
    }
}

exports.updatePost = async (req, res, next) => {
    try {
        const { post, body } = req;

        if (!Object.keys(body).length) {
            return res.status(400).json({ message: 'Bad request' });
        }

        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }

        body.imagesUrls = [];
        if (req.files) {
            req.files.forEach(file => body.imagesUrls.push(file.path));
        }

        const updatedPost = await post.updatePost({ _id: post._id }, body);
        return res.status(200).json({
            message: 'Post updated successfully',
            ...updatedPost
        });
    }
    catch (err) {
        return next(err);
    }
}