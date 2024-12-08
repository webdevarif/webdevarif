"use client";

import { SingleBlogPostProps } from '@/types/blogs';
// import Image from 'next/image';
import React from 'react';
import Moment from 'react-moment';
import { FaRegClock } from "react-icons/fa6";
import DOMPurify from 'dompurify';
// import TrackedSection from '@/components/Common/TrackedSection';

const PostData: React.FC<SingleBlogPostProps> = ({ post }) => {
  if (!post) {
    return <div>No post data available.</div>; // Handle the case where post is undefined
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "author": post?.author ?? 'webdevarif',
    "headline": post?.title ?? '',
    "image": post?.featured_image ?? '',
    "articleSection": (post?.categories ?? []).join(', '),
    "keywords": (post?.tags ?? []).join(', '),
    "description": post?.excerpt ?? '',
    "articleBody": post?.content ?? '',
    "datePublished": post?.date ?? '',
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionService": {
          "@type": "WebSite",
          "name": "Instagram",
          "url": "https://www.instagram.com/web_developer_arif/"
        },
        "interactionType": "https://schema.org/ShareAction",
        "userInteractionCount": post?.id ?? ''
      },
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/CommentAction",
        "userInteractionCount": post?.id ?? ''
      }
    ],
    "name": post?.title ?? ''
  };

  return (
    <div className='space-y-4'>
      {/* POST DATE */}
      <div className="font-medium flex items-center gap-2">
        <FaRegClock className='w-4 h-4'/>
        <Moment className='leading-[1]' format='MMMM Do YYYY'>{post.date}</Moment>
      </div>

      {/* SHARE ICONS */}
      <div className="">SHARE ICONS</div>

      {/* TABLE OF CONTENT */}
      <div className="">TABLE OF CONTENT</div>

      {/* POST CONTENT */}
      <div className='post-content' dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content ?? '') }}></div>
      {/* JSON-LD SCRIPT */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}

export default PostData;
