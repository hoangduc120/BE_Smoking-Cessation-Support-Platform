const Blog = require("../models/blog.model");
const mongoose = require("mongoose");
const Comment = require("../models/comment.model");
const Tags = require("../models/tags.model");

class BlogService {
    async createBlog(blogData) {
        const slug = blogData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        if (blogData.tags && blogData.tags.length > 0) {
            const processedTags = [];

            for (let tag of blogData.tags) {
                let tagName = typeof tag === 'string' ? tag : tag.tagName;

                if (tagName.startsWith('#')) {
                    tagName = tagName.substring(1);
                }

                let existingTag = await Tags.findOne({ tagName: { $regex: new RegExp(`^${tagName}$`, 'i') } });

                if (!existingTag) {
                    existingTag = await Tags.create({
                        tagId: tagName.toLowerCase().replace(/\s+/g, '-'),
                        tagName: tagName,
                        blogCount: 1
                    });
                } else {
                    existingTag.blogCount += 1;
                    await existingTag.save();
                }

                processedTags.push(existingTag._id);
            }

            blogData.tags = processedTags;
        }

        const blog = new Blog({
            ...blogData,
            slug: `${slug}-${Date.now()}`
        })
        await blog.save()
        return blog
    }
    async getAllBlogs({ page, limit, tag, slug, search, sortBy = 'createdAt', sortOrder = 'desc' }) {
        const query = { isDeleted: false, isHidden: false }

        if (tag) {
            const tagObj = await Tags.findOne({
                $or: [
                    { _id: mongoose.Types.ObjectId.isValid(tag) ? tag : null },
                    { tagId: tag },
                    { tagName: tag }
                ]
            });

            if (tagObj) {
                query.tags = tagObj._id;
            }
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        } else if (slug) {
            query.slug = { $regex: slug, $options: 'i' };
        }

        const sortOptions = {}
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const blogs = await Blog.find(query)
            .select('_id slug title description image tags createdAt user likes comments')
            .populate("user", "userName email profilePicture")
            .populate({
                path: "tags",
                select: "tagId tagName"
            })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort(sortOptions)
            .lean();

        const total = await Blog.countDocuments(query);

        return {
            blogs,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        }
    }
    async getBlogBySlug(slug) {
        return await Blog.findOne({
            slug,
            isDeleted: false,
            isHidden: false
        })
            .populate("user", "userName email profilePicture")
            .populate({
                path: "comments",
                populate: {
                    path: "author",
                    select: "userName email profilePicture"
                }
            })
            .populate("tags", "tagId tagName")
    }

    async getAllTags() {
        return await Tags.find({}).sort({ tagName: 1 });
    }

    async getBlogsByTag(tagId, { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) {
        const tag = await Tags.findOne({ tagId });

        if (!tag) {
            return null;
        }

        const query = {
            tags: tag._id,
            isDeleted: false,
            isHidden: false
        };

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const blogs = await Blog.find(query)
            .populate("user", "name email")
            .populate("comments")
            .populate("tags", "tagId tagName")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort(sortOptions);

        const total = await Blog.countDocuments(query);

        return {
            blogs,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            tag
        }
    }

    async updateBlog(id, updateData, userId) {
        const blog = await Blog.findOne({
            _id: id,
            user: userId,
            isDeleted: false,
        })

        if (!blog) {
            throw new Error("Blog not found or you are not authorized to update it")
        }

        if (updateData.tags) {
            if (blog.tags && blog.tags.length > 0) {
                for (let tagId of blog.tags) {
                    const tag = await Tags.findById(tagId);
                    if (tag) {
                        tag.blogCount = Math.max(0, tag.blogCount - 1);
                        await tag.save();
                    }
                }
            }

            if (updateData.tags.length > 0) {
                const processedTags = [];

                for (let tag of updateData.tags) {
                    let tagName = typeof tag === 'string' ? tag : tag.tagName;

                    if (tagName.startsWith('#')) {
                        tagName = tagName.substring(1);
                    }

                    let existingTag = await Tags.findOne({ tagName: { $regex: new RegExp(`^${tagName}$`, 'i') } });

                    if (!existingTag) {
                        existingTag = await Tags.create({
                            tagId: tagName.toLowerCase().replace(/\s+/g, '-'),
                            tagName: tagName,
                            blogCount: 1
                        });
                    } else {
                        existingTag.blogCount += 1;
                        await existingTag.save();
                    }

                    processedTags.push(existingTag._id);
                }

                updateData.tags = processedTags;
            }
        }

        Object.assign(blog, updateData)
        await blog.save()
        return blog
    }

    async deleteBlog(id, userId) {
        const blog = await Blog.findOne({
            _id: id,
            user: userId,
            isDeleted: false,
        })

        if (!blog) {
            throw new Error("Blog not found or you are not authorized to delete it")
        }

        if (blog.tags && blog.tags.length > 0) {
            for (let tagId of blog.tags) {
                const tag = await Tags.findById(tagId);
                if (tag) {
                    tag.blogCount = Math.max(0, tag.blogCount - 1);
                    await tag.save();
                }
            }
        }

        blog.isDeleted = true
        await blog.save()
        return blog
    }
    async likeBlog(id, userId) {
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
            return null;
        }

        try {
            const userIdStr = userId.toString();
            const userHasLiked = await Blog.findOne({
                _id: id,
                likes: userIdStr,
                isDeleted: false,
                isHidden: false
            }).select('_id').lean();

            let updateOperation;

            if (userHasLiked) {
                // Nếu đã like, bỏ like
                updateOperation = {
                    $pull: { likes: userId }
                };
            } else {
                // Nếu chưa like, thêm like
                updateOperation = {
                    $addToSet: { likes: userId }
                };
            }

            const updatedBlog = await Blog.findOneAndUpdate(
                { _id: id, isDeleted: false, isHidden: false },
                updateOperation,
                { new: true }
            ).select('_id likes');

            return updatedBlog;
        } catch (error) {
            console.error('Error in likeBlog:', error);
            return null;
        }
    }
    async addComment(blogId, commentText, userId) {
        const blog = await Blog.findOne({
            _id: blogId,
            isDeleted: false
        });

        if (!blog) return null;

        const comment = new Comment({
            text: commentText,
            author: userId,
            blog: blogId
        });

        const savedComment = await comment.save();
        blog.comments.push(savedComment._id);
        await blog.save();

        return savedComment.populate('author', 'name email');
    }

    async getBlogsByUserId(userId, { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return null;
        }

        const query = {
            user: userId,
            isDeleted: false,
            isHidden: false
        };

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const blogs = await Blog.find(query)
            .populate("user", "name email")
            .populate({
                path: "tags",
                select: "tagId tagName"
            })
            .populate({
                path: "comments",
                populate: {
                    path: "author",
                    select: "name email"
                }
            })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort(sortOptions)
            .lean();

        const total = await Blog.countDocuments(query);

        return {
            blogs,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        };
    }
}

module.exports = BlogService