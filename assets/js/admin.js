jQuery(document).ready(function($) {
    var currentPage = 1;
    var currentUserId = 0;

    // 搜索用户
    $('#zml-user-search-btn').on('click', function() {
        var keyword = $('#zml-user-search-input').val();
        if (!keyword) {
            alert('请输入用户ID或昵称');
            return;
        }

        var $btn = $(this);
        var $spinner = $btn.next('.spinner');
        
        $btn.prop('disabled', true);
        $spinner.addClass('is-active');

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'zml_admin_search_user',
                keyword: keyword,
                nonce: zmlAdmin.nonce
            },
            success: function(response) {
                if (response.success) {
                    var user = response.data;
                    currentUserId = user.ID;
                    $('#zml-admin-user-info .username').text(user.display_name);
                    $('#zml-admin-user-info .userid').text(user.ID);
                    $('#zml-admin-user-info').show();
                    loadUserMedia(1);
                } else {
                    alert(response.data.message || '未找到用户');
                    $('#zml-admin-user-info').hide();
                    $('#zml-admin-media-list').html('<p class="description">未找到用户</p>');
                }
            },
            complete: function() {
                $btn.prop('disabled', false);
                $spinner.removeClass('is-active');
            }
        });
    });

    // 加载用户媒体
    function loadUserMedia(page) {
        if (!currentUserId) return;
        
        $('#zml-admin-media-list').html('<p class="description">加载中...</p>');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'zml_get_user_media',
                target_user_id: currentUserId,
                page: page,
                nonce: zmlAdmin.nonce
            },
            success: function(response) {
                if (response.success) {
                    renderMediaList(response.data.files);
                    renderPagination(response.data.total, page);
                } else {
                    $('#zml-admin-media-list').html('<p class="description">' + (response.data.message || '加载失败') + '</p>');
                }
            }
        });
    }

    // 渲染媒体列表
    function renderMediaList(files) {
        if (!files || files.length === 0) {
            $('#zml-admin-media-list').html('<p class="description">该用户暂无媒体文件</p>');
            return;
        }

        var html = '<ul class="attachments ui-sortable">';
        $.each(files, function(i, file) {
            html += '<li class="attachment save-ready">';
            html += '<div class="attachment-preview type-image subtype-jpeg landscape">';
            html += '<div class="thumbnail">';
            html += '<div class="centered">';
            html += '<img src="' + file.thumbnail + '" alt="" draggable="false">';
            html += '</div>';
            html += '</div>';
            html += '</div>';
            html += '<button type="button" class="button-link check" title="选中"><span class="media-modal-icon"></span><span class="screen-reader-text">选中</span></button>';
            html += '<div class="filename"><div>' + file.name + '</div></div>';
            html += '<div class="actions">';
            html += '<button type="button" class="button-link delete-attachment" data-id="' + file.id + '">删除永久</button>';
            html += '</div>';
            html += '</li>';
        });
        html += '</ul>';
        
        $('#zml-admin-media-list').html(html);
    }

    // 删除文件
    $(document).on('click', '.delete-attachment', function() {
        if (!confirm('确定要删除这个文件吗？')) return;
        
        var $btn = $(this);
        var id = $btn.data('id');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'zml_delete_media',
                attachment_id: id,
                nonce: zmlAdmin.nonce
            },
            success: function(response) {
                if (response.success) {
                    $btn.closest('li').remove();
                } else {
                    alert(response.data.message || '删除失败');
                }
            }
        });
    });

    // 渲染分页 (简单版)
    function renderPagination(total, page) {
        // TODO: 实现分页逻辑
    }
});
