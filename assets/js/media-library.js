/**
 * Zibll Media Library Manager - JavaScript
 * 媒体管理器前端脚本
 */

(function ($) {
    'use strict';

    // 状态管理
    let currentMediaType = 'image';
    let currentSearchTerm = '';

    // 分页状态
    let paginationData = {
        image: { paged: 1, maxPages: 1, isLoading: false, isLoadedAll: false },
        video: { paged: 1, maxPages: 1, isLoading: false, isLoadedAll: false },
        other: { paged: 1, maxPages: 1, isLoading: false, isLoadedAll: false }
    };

    // 批量管理状态
    let isEditMode = false;
    let selectedMediaIds = [];

    // 滚动观察器
    let scrollObserver = null;

    /**
     * 初始化
     */
    $(document).ready(function () {
        // 打开弹窗按钮点击事件
        $('#zml-open-media-modal').on('click', function (e) {
            e.preventDefault();
            openMediaModal();
        });

        // 标签页切换事件
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            const target = $(e.target).attr('href');
            exitEditMode(); // 切换标签时退出编辑模式

            if (target === '#zml-tab-images') {
                currentMediaType = 'image';
            } else if (target === '#zml-tab-videos') {
                currentMediaType = 'video';
            } else if (target === '#zml-tab-others') {
                currentMediaType = 'other';
            }

            // 如果还未加载或者搜索词变化过，则重置并加载
            const listContainer = getListContainer(currentMediaType);
            if (listContainer.find('.zml-media-item').length === 0 &&
                listContainer.find('.zml-loading').length === 0 &&
                listContainer.find('.zml-empty-state').length === 0) {
                resetAndLoad(currentMediaType, currentSearchTerm);
            }
        });

        // 搜索功能
        let searchTimeout;
        $('.zml-search-input').on('input', function () {
            clearTimeout(searchTimeout);
            const searchTerm = $(this).val();
            const mediaType = $(this).data('type');

            searchTimeout = setTimeout(function () {
                currentSearchTerm = searchTerm;
                resetAndLoad(mediaType, searchTerm);
            }, 500);
        });

        // 弹窗显示时加载数据
        $('#zml-media-modal').on('shown.bs.modal', function () {
            // 初始化 IntersectionObserver 用于无限加载
            initScrollObserver();
            // 注入批量管理UI
            injectBatchUI();

            // 只在第一次打开时加载
            if ($('#zml-images-list').find('.zml-media-item').length === 0 &&
                $('#zml-images-list').find('.zml-loading').length === 0 &&
                $('#zml-images-list').find('.zml-empty-state').length === 0) {
                resetAndLoad('image');
            }
        });

        // 弹窗关闭时清空搜索及重置状态
        $('#zml-media-modal').on('hidden.bs.modal', function () {
            $('.zml-search-input').val('');
            currentSearchTerm = '';
            exitEditMode();
            if (scrollObserver) {
                scrollObserver.disconnect();
            }
        });
    });

    /**
     * 打开媒体弹窗
     */
    function openMediaModal() {
        $('#zml-media-modal').modal('show');
    }

    /**
     * 重置分页并加载
     */
    function resetAndLoad(mediaType, search) {
        paginationData[mediaType] = { paged: 1, maxPages: 1, isLoading: false, isLoadedAll: false };
        const listContainer = getListContainer(mediaType);
        listContainer.empty();
        loadMediaFiles(mediaType, search);
    }

    /**
     * 初始化滚动监听（无限加载）
     */
    function initScrollObserver() {
        if (scrollObserver) {
            scrollObserver.disconnect();
        }

        const options = {
            root: null, // viewport
            rootMargin: '0px 0px 200px 0px', // 提前200px触发
            threshold: 0
        };

        scrollObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    const state = paginationData[currentMediaType];
                    if (!state.isLoading && !state.isLoadedAll) {
                        state.paged++;
                        loadMediaFiles(currentMediaType, currentSearchTerm);
                    }
                }
            });
        }, options);
    }

    /**
     * 添加底部监听锚点
     */
    function appendLoadAnchor(container, mediaType) {
        // 先移除旧的
        container.find('.zml-load-anchor').remove();

        const state = paginationData[mediaType];
        if (state.isLoadedAll) {
            container.append('<div class="zml-load-anchor zml-loaded-all text-center muted-3-color mt20 mb20" style="width: 100%; grid-column: 1 / -1;">- 已加载全部内容 -</div>');
        } else {
            const anchor = $('<div class="zml-load-anchor text-center muted-3-color mt20 mb20" style="width: 100%; grid-column: 1 / -1;"><i class="fa fa-spinner fa-spin"></i> 加载中...</div>');
            container.append(anchor);
            if (scrollObserver) {
                scrollObserver.observe(anchor[0]);
            }
        }
    }

    /**
     * 加载媒体文件列表
     */
    function loadMediaFiles(mediaType, search) {
        search = search || '';
        const listContainer = getListContainer(mediaType);
        const state = paginationData[mediaType];

        if (state.isLoading || state.isLoadedAll) return;
        state.isLoading = true;

        // 如果是第一页，显示大Loading
        if (state.paged === 1) {
            showLoading(listContainer);
        }

        // AJAX请求
        $.ajax({
            url: zmlAjax.ajaxurl,
            type: 'POST',
            data: {
                action: 'zml_get_user_media',
                nonce: zmlAjax.nonce,
                media_type: mediaType,
                search: search,
                paged: state.paged
            },
            success: function (response) {
                state.isLoading = false;
                if (response.success) {
                    // 更新最大页数
                    state.maxPages = response.data.max_pages;
                    if (state.paged >= state.maxPages) {
                        state.isLoadedAll = true;
                    }

                    renderMediaList(listContainer, response.data.files, mediaType, state.paged === 1);
                } else {
                    if (state.paged === 1) {
                        showError(listContainer, response.data.message || zmlAjax.loadFailed);
                    } else {
                        state.paged--; // 回退页码
                        if (typeof Notyf !== 'undefined') new Notyf().error(response.data.message || zmlAjax.loadFailed);
                    }
                }
            },
            error: function (xhr, status, error) {
                state.isLoading = false;
                if (state.paged === 1) {
                    showError(listContainer, zmlAjax.loadFailed + '<br><small>' + error + '</small>');
                } else {
                    state.paged--;
                }
            }
        });
    }

    /**
     * 渲染媒体列表
     */
    function renderMediaList(container, files, mediaType, isFirstPage) {
        // 如果是第一页，先清空加载动画
        if (isFirstPage) {
            container.empty();
        } else {
            // 否则只移除底部的加载锚点
            container.find('.zml-load-anchor').remove();
        }

        if (files.length === 0 && isFirstPage) {
            showEmptyState(container, mediaType);
            return;
        }

        // 根据类型设置不同的布局
        if (isFirstPage) {
            container.removeClass('zml-grid-view zml-image-grid zml-video-list zml-list-view');
            if (mediaType === 'image') {
                container.addClass('zml-grid-view zml-image-grid');
            } else if (mediaType === 'video') {
                container.addClass('zml-video-list');
            } else {
                container.addClass('zml-list-view');
            }
        }

        files.forEach(function (file) {
            const item = createMediaItem(file, mediaType);
            container.append(item);
        });

        // 重新添加监听锚点
        appendLoadAnchor(container, mediaType);

        // 绑定事件
        bindDeleteEvents();
        bindViewEvents();
        bindDownloadEvents();
        bindSelectEvents();
    }

    /**
     * 创建媒体项HTML
     */
    function createMediaItem(file, mediaType) {
        console.log('Creating media item:', file.name, mediaType);

        if (mediaType === 'other') {
            return createListItem(file);
        } else {
            return createGridItem(file, mediaType);
        }
    }

    /**
     * 创建网格视图项（图片）
     */
    function createGridItem(file, mediaType) {
        let thumbnailHtml = '';

        if (mediaType === 'image') {
            thumbnailHtml = '<img src="' + file.thumbnail + '" alt="' + file.name + '">';
        } else if (mediaType === 'video') {
            // 视频使用列表布局
            return createVideoItem(file);
        }

        const authorBadge = file.author_id != zmlAjax.currentUserId && file.author ? '<span class="zml-author-badge">' + file.author + '</span>' : '';

        const viewBtn = '<button class="zml-action-btn zml-view-btn" data-url="' + file.url + '" data-name="' + file.name + '" title="查看"><i class="fa fa-eye"></i></button>';
        const deleteBtn = file.can_delete ? '<button class="zml-action-btn zml-delete-btn" data-id="' + file.id + '" title="删除"><i class="fa fa-trash-o"></i></button>' : '';
        const checkboxHtml = file.can_delete ? '<div class="zml-item-checkbox"></div>' : '';

        const itemHtml = '<div class="zml-media-item" data-id="' + file.id + '" data-url="' + file.url + '" data-name="' + file.name + '">' + checkboxHtml + '<div class="zml-media-actions">' + viewBtn + deleteBtn + '</div><div class="zml-media-thumb">' + thumbnailHtml + '</div><div class="zml-media-info"><div class="zml-media-name" title="' + file.name + '">' + file.name + '</div>' + authorBadge + '<div class="zml-media-meta">大小: ' + file.size + '</div><div class="zml-media-meta">日期: ' + file.date + '</div></div></div>';

        return $(itemHtml);
    }

    /**
     * 创建视频列表项
     */
    function createVideoItem(file) {
        let thumbnailHtml = '';
        if (file.thumbnail) {
            thumbnailHtml = '<img src="' + file.thumbnail + '" alt="' + file.name + '"><div class="zml-video-play-icon"><i class="fa fa-play"></i></div>';
        } else {
            thumbnailHtml = '<i class="fa fa-file-video-o zml-file-icon"></i>';
        }

        const authorBadge = file.author_id != zmlAjax.currentUserId && file.author ? '<span class="zml-author-badge">' + file.author + '</span>' : '';

        const viewBtn = '<button class="zml-action-btn zml-view-btn" data-url="' + file.url + '" data-name="' + file.name + '" title="查看"><i class="fa fa-eye"></i></button>';
        const deleteBtn = file.can_delete ? '<button class="zml-action-btn zml-delete-btn" data-id="' + file.id + '" title="删除"><i class="fa fa-trash-o"></i></button>' : '';
        const checkboxHtml = file.can_delete ? '<div class="zml-item-checkbox"></div>' : '';

        const itemHtml = '<div class="zml-media-item" data-id="' + file.id + '" data-url="' + file.url + '" data-name="' + file.name + '">' + checkboxHtml + '<div class="zml-media-actions">' + viewBtn + deleteBtn + '</div><div class="zml-media-thumb">' + thumbnailHtml + '</div><div class="zml-media-info"><div class="zml-media-name" title="' + file.name + '">' + file.name + '</div>' + authorBadge + '<div class="zml-media-meta">大小: ' + file.size + '</div><div class="zml-media-meta">日期: ' + file.date + '</div></div></div>';

        return $(itemHtml);
    }

    /**
     * 获取文件扩展名颜色
     */
    function getExtColor(ext) {
        const colors = {
            'zip': '#9b59b6', 'rar': '#8e44ad', '7z': '#8e44ad',
            'pdf': '#e74c3c', 'doc': '#2980b9', 'docx': '#2980b9',
            'xls': '#27ae60', 'xlsx': '#27ae60',
            'ppt': '#e67e22', 'pptx': '#e67e22',
            'mp3': '#1abc9c', 'wav': '#16a085',
            'txt': '#7f8c8d'
        };
        return colors[ext] || '#bdc3c7'; // 默认极地灰
    }

    /**
     * 创建列表视图项（其他文件）
     */
    function createListItem(file) {
        const iconClass = getFileIcon(file.mime_type);
        const ext = file.name.split('.').pop().toLowerCase();
        const extColor = getExtColor(ext);

        let iconHtml = '';
        if (file.thumbnail) {
            iconHtml = '<img src="' + file.thumbnail + '" alt="' + file.name + '">';
        } else {
            iconHtml = '<i class="fa ' + iconClass + ' zml-file-icon"></i>';
        }

        const authorBadge = file.author_id != zmlAjax.currentUserId && file.author ? '<span class="zml-author-badge">' + file.author + '</span>' : '';

        const downloadBtn = '<button class="zml-action-btn zml-download-btn" data-url="' + file.url + '" data-name="' + file.name + '" title="下载"><i class="fa fa-download"></i></button>';
        const deleteBtn = file.can_delete ? '<button class="zml-action-btn zml-delete-btn" data-id="' + file.id + '" title="删除"><i class="fa fa-trash-o"></i></button>' : '';
        const checkboxHtml = file.can_delete ? '<div class="zml-item-checkbox"></div>' : '';

        // 生成彩色的 ext badge
        const extBadge = '<span class="zml-ext-badge" style="background-color: ' + extColor + ';">' + ext + '</span>';

        const itemHtml = '<div class="zml-media-item" data-id="' + file.id + '">' + checkboxHtml + '<div class="zml-list-box"><div class="zml-list-icon-box">' + iconHtml + '</div><div class="zml-list-content"><div class="zml-media-name" title="' + file.name + '">' + file.name + '</div>' + authorBadge + '<div class="zml-list-meta">' + extBadge + '<span>日期: ' + file.date + '</span><span>' + file.size + '</span></div></div><div class="zml-media-actions">' + downloadBtn + deleteBtn + '</div></div></div>';

        return $(itemHtml);
    }

    /**
     * 根据MIME类型获取文件图标
     */
    function getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) return 'fa-file-pdf-o';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word-o';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel-o';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint-o';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'fa-file-archive-o';
        if (mimeType.includes('audio')) return 'fa-file-audio-o';
        if (mimeType.includes('text') || mimeType.includes('code')) return 'fa-file-code-o';
        return 'fa-file-o';
    }

    /**
     * 绑定删除按钮事件
     */
    function bindDeleteEvents() {
        $('.zml-delete-btn').off('click').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const btn = $(this);
            const attachmentId = btn.data('id');
            const mediaItem = btn.closest('.zml-media-item');
            const fileName = mediaItem.find('.zml-media-name').attr('title');

            showDeleteConfirm(attachmentId, mediaItem, fileName);
        });
    }

    /**
     * 显示删除确认弹窗
     */
    function showDeleteConfirm(attachmentId, mediaItem, fileName) {
        if (confirm("您正在删除文件（" + fileName + "）\n\n删除后无法恢复，确定要删除吗？")) {
            deleteMedia(attachmentId, mediaItem, function () {
                if (typeof Notyf !== 'undefined') new Notyf().success(zmlAjax.deleteSuccess || '文件删除成功');
            }, function () {
                if (typeof Notyf !== 'undefined') new Notyf().error(zmlAjax.deleteFailed || '文件删除失败');
            });
        }
    }

    function deleteMedia(attachmentId, mediaItem, successCallback, errorCallback) {
        // 添加删除中状态
        mediaItem.addClass('zml-deleting');

        $.ajax({
            url: zmlAjax.ajaxurl,
            type: 'POST',
            data: {
                action: 'zml_delete_media',
                nonce: zmlAjax.nonce,
                attachment_id: attachmentId
            },
            success: function (response) {
                if (response.success) {
                    // 删除成功，移除元素
                    mediaItem.fadeOut(300, function () {
                        $(this).remove();
                        // 检查是否为空
                        const container = getListContainer(currentMediaType);
                        if (container.find('.zml-media-item').length === 0) {
                            showEmptyState(container, currentMediaType);
                        }
                    });

                    // 显示成功提示（如果主题有提示函数）
                    if (typeof Notyf !== 'undefined') {
                        new Notyf().success(zmlAjax.deleteSuccess);
                    }

                    // 调用成功回调
                    if (typeof successCallback === 'function') {
                        successCallback();
                    }
                } else {
                    mediaItem.removeClass('zml-deleting');
                    const message = response.data.message || zmlAjax.deleteFailed;

                    if (typeof Notyf !== 'undefined') {
                        new Notyf().error(message);
                    } else {
                        alert(message);
                    }

                    // 调用错误回调
                    if (typeof errorCallback === 'function') {
                        errorCallback();
                    }
                }
            },
            error: function () {
                mediaItem.removeClass('zml-deleting');

                if (typeof Notyf !== 'undefined') {
                    new Notyf().error(zmlAjax.deleteFailed);
                } else {
                    alert(zmlAjax.deleteFailed);
                }

                // 调用错误回调
                if (typeof errorCallback === 'function') {
                    errorCallback();
                }
            }
        });
    }

    /**
     * 获取列表容器
     */
    function getListContainer(mediaType) {
        if (mediaType === 'image') {
            return $('#zml-images-list');
        } else if (mediaType === 'video') {
            return $('#zml-videos-list');
        } else {
            return $('#zml-others-list');
        }
    }

    /**
     * 显示加载状态
     */
    function showLoading(container) {
        container.html('<div class="zml-loading"><i class="fa fa-spinner fa-spin fa-2x"></i><p class="mt10">加载中...</p></div>');
    }

    /**
     * 显示空状态
     */
    function showEmptyState(container, mediaType) {
        let message = '暂无文件';
        let icon = 'fa-folder-open-o';

        if (mediaType === 'image') {
            message = '暂无图片文件';
            icon = 'fa-picture-o';
        } else if (mediaType === 'video') {
            message = '暂无视频文件';
            icon = 'fa-film';
        } else if (mediaType === 'other') {
            message = '暂无其他文件';
            icon = 'fa-file-o';
        }

        container.html('<div class="zml-empty-state"><i class="fa ' + icon + '"></i><p>' + message + '</p></div>');
    }

    /**
     * 显示错误信息
     */
    function showError(container, message) {
        container.html('<div class="zml-empty-state"><i class="fa fa-exclamation-triangle"></i><p>' + message + '</p></div>');
    }

    /**
     * 绑定查看按钮事件
     */
    function bindViewEvents() {
        $('.zml-view-btn').off('click').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const btn = $(this);
            const imageUrl = btn.data('url');
            const imageName = btn.data('name');

            // 调用主题的图片查看器
            if (typeof show_imgbox === 'function') {
                show_imgbox([imageUrl]);
            } else {
                // 如果主题函数不存在，使用简单的新窗口打开
                window.open(imageUrl, '_blank');
            }
        });

        // 也可以点击图片本身查看，但在编辑模式下劫持点击作为选中
        $('.zml-image-grid .zml-media-item, .zml-video-list .zml-media-item').off('click').on('click', function (e) {
            // 如果点击的是按钮，不触发
            if ($(e.target).closest('.zml-action-btn').length > 0) {
                return;
            }

            if (isEditMode) {
                // 编辑模式：触发选中
                toggleSelectMedia($(this));
                return;
            }

            const imageUrl = $(this).data('url');
            if (imageUrl && typeof show_imgbox === 'function') {
                show_imgbox([imageUrl]);
            }
        });
    }

    /**
     * 绑定下载按钮事件
     */
    function bindDownloadEvents() {
        $('.zml-download-btn').off('click').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const btn = $(this);
            const fileUrl = btn.data('url');
            const fileName = btn.data('name');

            // 创建隐藏的下载链接
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    /* =========================================
       批量管理与多选逻辑 (Batch Management)
       ========================================= */

    /**
     * 注入批量管理UI
     */
    function injectBatchUI() {
        if ($('#zml-batch-toggle-btn').length > 0) return;

        // 在各个tab搜索栏右侧注入批量管理开关
        $('.tab-pane .flex.ac.jsb').each(function () {
            $(this).prepend('<button class="but zml-batch-toggle" id="zml-batch-toggle-btn"><i class="fa fa-list-ul"></i> 批量管理</button>');
        });

        // 注入底部悬浮操作栏
        const actionBar = '<div class="zml-batch-action-bar" id="zml-batch-action-bar"><div class="zml-batch-info">已选择 <span id="zml-batch-count">0</span> 项</div><div class="zml-batch-buttons"><button class="but c-yellow zml-batch-cancel-btn">取消</button><button class="but c-red zml-batch-delete-btn" disabled><i class="fa fa-trash-o"></i> 删除选定</button></div></div>';
        $('.mini-media-content').append(actionBar);

        // 绑定批量开关事件
        $('.zml-batch-toggle').on('click', function () {
            if (isEditMode) {
                exitEditMode();
            } else {
                enterEditMode();
            }
        });

        // 绑定取消按钮
        $('.zml-batch-cancel-btn').on('click', function () {
            exitEditMode();
        });

        // 绑定批量删除请求
        $('.zml-batch-delete-btn').on('click', function () {
            if (selectedMediaIds.length === 0) return;
            showBatchDeleteConfirm();
        });
    }

    /**
     * 绑定媒体项可选事件（针对列表项，网格项已经在上述 viewEvent 中劫持）
     */
    function bindSelectEvents() {
        $('.zml-list-view .zml-media-item').off('click').on('click', function (e) {
            if ($(e.target).closest('.zml-action-btn').length > 0) {
                return;
            }
            if (isEditMode) {
                toggleSelectMedia($(this));
            }
        });

        // 点击独立复选框（适用于所有项）
        $('.zml-item-checkbox').off('click').on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (isEditMode) {
                toggleSelectMedia($(this).closest('.zml-media-item'));
            }
        });
    }

    function enterEditMode() {
        isEditMode = true;
        $('.mini-media-content').addClass('zml-edit-mode');
        selectedMediaIds = [];
        updateBatchCount();
        $('.zml-batch-toggle').addClass('active').html('<i class="fa fa-times"></i> 退出管理');
    }

    function exitEditMode() {
        isEditMode = false;
        $('.mini-media-content').removeClass('zml-edit-mode');
        // 取消所有选中
        $('.zml-media-item').removeClass('zml-selected');
        selectedMediaIds = [];
        updateBatchCount();
        $('.zml-batch-toggle').removeClass('active').html('<i class="fa fa-list-ul"></i> 批量管理');
    }

    function toggleSelectMedia(item) {
        const id = item.data('id');
        if (!id) return;

        if (item.hasClass('zml-selected')) {
            item.removeClass('zml-selected');
            selectedMediaIds = selectedMediaIds.filter(v => v !== id);
        } else {
            item.addClass('zml-selected');
            if (!selectedMediaIds.includes(id)) {
                selectedMediaIds.push(id);
            }
        }
        updateBatchCount();
    }

    function updateBatchCount() {
        const count = selectedMediaIds.length;
        $('#zml-batch-count').text(count);
        if (count > 0) {
            $('.zml-batch-delete-btn').prop('disabled', false);
        } else {
            $('.zml-batch-delete-btn').prop('disabled', true);
        }
    }

    /**
     * 批量删除确认和请求
     */
    function showBatchDeleteConfirm() {
        if (!confirm("您已选中 " + selectedMediaIds.length + " 个文件\n\n删除后无法恢复，确认要全部删除吗？")) {
            return;
        }

        const btn = $('.zml-batch-delete-btn');
        btn.prop('disabled', true).text('删除中...');

        $.ajax({
            url: zmlAjax.ajaxurl,
            type: 'POST',
            data: {
                action: 'zml_delete_media_batch',
                nonce: zmlAjax.nonce,
                attachment_ids: selectedMediaIds
            },
            success: function (response) {
                if (response.success) {
                    if (typeof Notyf !== 'undefined') new Notyf().success(response.data.message || '批量删除成功');

                    // 从 DOM 中移除选中的项
                    $('.zml-media-item.zml-selected').fadeOut(400, function () {
                        $(this).remove();
                        const container = getListContainer(currentMediaType);
                        if (container.find('.zml-media-item').length === 0) {
                            showEmptyState(container, currentMediaType);
                        }
                    });
                    // 退出编辑模式
                    exitEditMode();
                } else {
                    btn.prop('disabled', false).html('<i class="fa fa-trash-o"></i>删除选定');
                    if (typeof Notyf !== 'undefined') new Notyf().error(response.data.message || zmlAjax.deleteFailed);
                }
            },
            error: function () {
                btn.prop('disabled', false).html('<i class="fa fa-trash-o"></i>删除选定');
                if (typeof Notyf !== 'undefined') new Notyf().error(zmlAjax.deleteFailed);
            }
        });
    }

})(jQuery);

