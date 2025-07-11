const asyncHandler = require('express-async-handler');
const BlogService = require('../services/blog.service');

const blogService = new BlogService();

const createBlog = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error('User not authenticated');
    }

    const blogData = req.body
    blogData.user = req.user._id

    const blog = await blogService.createBlog(blogData)
    res.status(201).json({
        success: true,
        message: "Blog created successfully",
        data: blog
    })
})

const getAllBlogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, tag, slug, search, sortBy, sortOrder } = req.query
    const blogs = await blogService.getAllBlogs({ page, limit, tag, slug, search, sortBy, sortOrder })
    res.status(200).json({
        success: true,
        message: "Blogs fetched successfully",
        data: blogs
    })
})

const getBlogBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params
    const blog = await blogService.getBlogBySlug(slug)
    res.status(200).json({
        success: true,
        message: "Blog fetched successfully",
        data: blog
    })
})

const getAllTags = asyncHandler(async (req, res) => {
    const tags = await blogService.getAllTags();
    res.status(200).json({
        success: true,
        message: "Tags fetched successfully",
        data: tags
    })
})

const getBlogsByTag = asyncHandler(async (req, res) => {
    const { tagId } = req.params;
    const { page = 1, limit = 10, sortBy, sortOrder } = req.query;

    const result = await blogService.getBlogsByTag(tagId, { page, limit, sortBy, sortOrder });

    res.status(200).json({
        success: true,
        message: "Blogs with tag fetched successfully",
        data: result
    })
})

const updateBlog = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error('User not authenticated');
    }

    const blog = await blogService.updateBlog(req.params.id, req.body, req.user._id);
    res.status(200).json({
        success: true,
        data: blog,
        message: 'Blog updated successfully'
    });
});

const deleteBlog = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error('User not authenticated');
    }
    const blog = await blogService.deleteBlog(req.params.id, req.user._id);

    res.status(200).json({
        success: true,
        message: 'Blog deleted successfully'
    })
})

const likeBlog = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error('User not authenticated');
    }

    const { _id } = req.user
    const { bid } = req.params
    if (!bid) {
        res.status(400);
        throw new Error('Missing blog ID')
    }
    const blog = await blogService.likeBlog(bid, _id)
    if (!blog) {
        res.status(404);
        throw new Error('Blog not found')
    }
    res.status(200).json({
        success: true,
        message: 'Blog liked successfully',
        data: blog
    })
})

const addComment = asyncHandler(async (req, res) => {
    if (!req.user || !req.user._id) {
        res.status(401);
        throw new Error('User not authenticated');
    }

    const comment = await blogService.addComment(req.params.id, req.body.comment, req.user._id);
    if (!comment) {
        res.status(404);
        throw new Error('Blog not found')
    }
    res.status(200).json({
        success: true,
        message: 'Comment added successfully',
        data: comment
    })
})

const getBlogsByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, sortBy, sortOrder } = req.query;

    const result = await blogService.getBlogsByUserId(userId, { page, limit, sortBy, sortOrder });

    if (!result) {
        res.status(404);
        throw new Error('User not found or invalid user ID');
    }

    res.status(200).json({
        success: true,
        message: "User's blogs fetched successfully",
        data: result
    });
});

module.exports = {
    createBlog,
    getAllBlogs,
    getBlogBySlug,
    updateBlog,
    deleteBlog,
    likeBlog,
    addComment,
    getAllTags,
    getBlogsByTag,
    getBlogsByUserId
}
