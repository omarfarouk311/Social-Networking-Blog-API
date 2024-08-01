const Post = require('../../models/post');

function authorizePostModification(operation) {
    return async (req, res, next) => {
        const { postId } = req.params, { userId } = req;
        const projection = operation ? { imagesUrls: 1 } : { imagesUrls: 1, bookmarkingUsersIds: 1, likingUsersIds: 1 };
        
        try {
            const post = await Post.getPost({ creatorId: userId }).project(projection);

            if (!post) {
                const exist = await Post.getPost({ _id: postId }).project({ _id: 1 });
                if (exist) {
                    return res.status(403).json({
                        message: (operation ? 'Unauthorized request to update the post' : 'Unauthorized request to delete the post')
                    });
                }
                return res.status(404).json({
                    message: 'Post not found'
                });
            }

            req.post = new Post(post);
            return next();
        }
        catch (err) {
            return next(err);
        }
    };
}

exports.authorizePostDeletion = authorizePostModification(0);

exports.authorizePostUpdating = authorizePostModification(1);