<?php
/**
 * Plugin Name: 用户媒体管理插件
 * Plugin URI: http://www.8f0.top/
 * Description: 为Zibll主题添加用户媒体管理功能，允许用户查看和删除自己上传的媒体文件
 * Version: 1.0.0
 * Author: 元界云基
 * Author URI: http://www.8f0.top/
 */

// 防止直接访问
if (!defined('ABSPATH')) {
    exit;
}

// 定义插件常量
define('ZML_VERSION', '1.0.0');
define('ZML_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ZML_PLUGIN_URL', plugin_dir_url(__FILE__));

// 引入选项配置
require_once ZML_PLUGIN_DIR . 'inc/options.php';

/**
 * 获取插件配置
 */
function zml_pz($name, $default = false) {
    $options = get_option('zml_options');
    if (is_array($options) && isset($options[$name])) {
        return $options[$name];
    }
    return $default;
}

/**
 * 检查当前用户是否有权限使用
 */
function zml_current_user_can_use() {
    if (!zml_pz('is_open', true)) {
        return false;
    }
    
    $user = wp_get_current_user();
    $allowed_roles = zml_pz('allowed_roles');
    
    // 如果没有设置角色限制，默认允许所有
    if (empty($allowed_roles)) {
        return true;
    }
    
    // 检查用户角色
    foreach ($user->roles as $role) {
        if (in_array($role, $allowed_roles)) {
            return true;
        }
    }
    
    return false;
}

/**
 * 加载插件资源
 */
function zml_enqueue_scripts() {
    // 只在前端加载，且用户有权限
    if (!is_admin() && is_user_logged_in() && zml_current_user_can_use()) {
        // 加载CSS
        wp_enqueue_style(
            'zml-media-library',
            ZML_PLUGIN_URL . 'assets/css/media-library.css',
            array(),
            ZML_VERSION
        );

        // 加载JavaScript
        wp_enqueue_script(
            'zml-media-library',
            ZML_PLUGIN_URL . 'assets/js/media-library.js',
            array('jquery'),
            ZML_VERSION,
            true
        );

        // 传递AJAX URL和nonce到JavaScript
        wp_localize_script('zml-media-library', 'zmlAjax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('zml_nonce'),
            'confirmDelete' => '确定要删除这个文件吗？删除后无法恢复！',
            'deleteSuccess' => '文件删除成功',
            'deleteFailed' => '文件删除失败，请重试',
            'loadFailed' => '加载文件列表失败，请刷新页面重试',
            'noPermission' => '您没有权限执行此操作',
        ));
    }
}
add_action('wp_enqueue_scripts', 'zml_enqueue_scripts');

/**
 * 在用户中心侧边栏添加媒体管理按钮
 */
function zml_add_media_button($content) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return $content;
    }

    // 检查开关和权限
    if (!zml_pz('is_open', true) || !zml_pz('show_in_user_center', true) || !zml_current_user_can_use()) {
        return $content;
    }

    $button = '<div class="theme-box">
        <a href="javascript:void(0);" id="zml-open-media-modal" class="but c-blue btn-block">
            <i class="fa fa-picture-o mr6"></i>我的媒体库
        </a>
    </div>';

    return $content . $button;
}
add_filter('user_center_page_sidebar', 'zml_add_media_button', 10);

/**
 * 输出媒体管理弹窗HTML
 */
function zml_media_modal_html() {
    if (!is_user_logged_in() || !zml_current_user_can_use()) {
        return;
    }
    ?>
    <div class="modal fade" id="zml-media-modal" tabindex="-1" role="dialog" >
        <div class="modal-mini full-sm modal-dialog" role="document">
            <div class="modal-content">
                <button data-dismiss="modal" class="mr10 mt10 close">
                    <svg class="ic-close" aria-hidden="true">
                        <use xlink:href="#icon-close"></use>
                    </svg>
                </button>
                <div class="mini-media-content">
                    <ul class="mt20 text-center list-inline tab-nav-media-library">
                        <li class="active">
                            <a href="#zml-tab-images" data-toggle="tab">图片</a>
                        </li>
                        <li>
                            <a href="#zml-tab-videos" data-toggle="tab">视频</a>
                        </li>
                        <li>
                            <a href="#zml-tab-others" data-toggle="tab">其他</a>
                        </li>
                    </ul>
                    <div class="tab-content">
                        <!-- 图片标签页 -->
                        <div class="tab-pane fade in active" id="zml-tab-images">
                            <div class="mini-media-my-box">
                                <div class="my-header box-body">
                                    <div class="flex ac jsb">
                                        <div class="relative flex1">
                                            <input class="form-control search-input zml-search-input" 
                                                   type="text" 
                                                   placeholder="搜索图片文件名" 
                                                   data-type="image">
                                            <div class="abs-right muted-3-color">
                                                <svg class="icon" aria-hidden="true">
                                                    <use xlink:href="#icon-search"></use>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="type-image notop box-body zml-mini-media-my-lists mini-scrollbar scroll-y" 
                                     id="zml-images-list" style="min-height: 300px; max-height: 50vh;">
                                    <div class="text-center padding-20 muted-2-color">
                                        <i class="fa fa-spinner fa-spin fa-2x"></i>
                                        <p class="mt10">加载中...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 视频标签页 -->
                        <div class="tab-pane fade" id="zml-tab-videos">
                            <div class="mini-media-my-box">
                                <div class="my-header box-body">
                                    <div class="flex ac jsb">
                                        <div class="relative flex1">
                                            <input class="form-control search-input zml-search-input" 
                                                   type="text" 
                                                   placeholder="搜索视频文件名" 
                                                   data-type="video">
                                            <div class="abs-right muted-3-color">
                                                <svg class="icon" aria-hidden="true">
                                                    <use xlink:href="#icon-search"></use>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="type-video notop box-body zml-mini-media-my-lists mini-scrollbar scroll-y" 
                                     id="zml-videos-list" style="min-height: 300px; max-height: 50vh;">
                                    <div class="text-center padding-20 muted-2-color">
                                        <i class="fa fa-spinner fa-spin fa-2x"></i>
                                        <p class="mt10">加载中...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 其他文件标签页 -->
                        <div class="tab-pane fade" id="zml-tab-others">
                            <div class="mini-media-my-box">
                                <div class="my-header box-body">
                                    <div class="flex ac jsb">
                                        <div class="relative flex1">
                                            <input class="form-control search-input zml-search-input" 
                                                   type="text" 
                                                   placeholder="搜索文件名" 
                                                   data-type="other">
                                            <div class="abs-right muted-3-color">
                                                <svg class="icon" aria-hidden="true">
                                                    <use xlink:href="#icon-search"></use>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="type-other notop box-body zml-mini-media-my-lists mini-scrollbar scroll-y" 
                                     id="zml-others-list" style="min-height: 300px; max-height: 50vh;">
                                    <div class="text-center padding-20 muted-2-color">
                                        <i class="fa fa-spinner fa-spin fa-2x"></i>
                                        <p class="mt10">加载中...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php
}
add_action('wp_footer', 'zml_media_modal_html');

/**
 * 加载后台资源
 */
function zml_admin_enqueue_scripts($hook) {
    // 检查是否在插件设置页面
    if (strpos($hook, 'zml-options') !== false) {
        wp_enqueue_script('zml-admin', ZML_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), ZML_VERSION, true);
        wp_enqueue_style('zml-admin', ZML_PLUGIN_URL . 'assets/css/admin.css', array(), ZML_VERSION);
        
        wp_localize_script('zml-admin', 'zmlAdmin', array(
            'nonce' => wp_create_nonce('zml_nonce')
        ));
    }
}
add_action('admin_enqueue_scripts', 'zml_admin_enqueue_scripts');

/**
 * AJAX: 搜索用户 (管理员)
 */
function zml_admin_search_user() {
    check_ajax_referer('zml_nonce', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => '权限不足'));
    }
    
    $keyword = isset($_POST['keyword']) ? sanitize_text_field($_POST['keyword']) : '';
    if (empty($keyword)) {
        wp_send_json_error(array('message' => '请输入关键词'));
    }
    
    // 按ID查找
    if (is_numeric($keyword)) {
        $user = get_user_by('id', $keyword);
    } else {
        // 按登录名或昵称查找
        $user = get_user_by('login', $keyword);
        if (!$user) {
            // 尝试通过显示名称查找
            $users = get_users(array(
                'search' => '*' . $keyword . '*',
                'search_columns' => array('display_name'),
                'number' => 1
            ));
            if (!empty($users)) {
                $user = $users[0];
            }
        }
    }
    
    if ($user) {
        wp_send_json_success(array(
            'ID' => $user->ID,
            'display_name' => $user->display_name,
            'user_login' => $user->user_login
        ));
    } else {
        wp_send_json_error(array('message' => '未找到用户'));
    }
}
add_action('wp_ajax_zml_admin_search_user', 'zml_admin_search_user');

/**
 * AJAX: 获取用户媒体文件
 */
function zml_get_user_media() {
    // 验证nonce
    check_ajax_referer('zml_nonce', 'nonce');

    // 检查用户登录
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => '请先登录'));
    }

    $current_user_id = get_current_user_id();
    $target_user_id = isset($_POST['target_user_id']) ? intval($_POST['target_user_id']) : $current_user_id;

    // 只有管理员可以查看他人的媒体
    if ($target_user_id != $current_user_id) {
        if (!current_user_can('manage_options')) {
             wp_send_json_error(array('message' => '您没有权限查看他人的媒体文件'));
        }
    } else {
        // 检查普通用户权限
        if (!zml_current_user_can_use()) {
            wp_send_json_error(array('message' => '您没有权限使用此功能'));
        }
    }

    $user_id = $target_user_id;
    $media_type = isset($_POST['media_type']) ? sanitize_text_field($_POST['media_type']) : 'image';
    $search = isset($_POST['search']) ? sanitize_text_field($_POST['search']) : '';
    $paged = isset($_POST['paged']) ? intval($_POST['paged']) : 1;
    $posts_per_page = 30; // 每页数量

    // 构建查询参数
    $args = array(
        'post_type' => 'attachment',
        'post_status' => 'inherit',
        'posts_per_page' => $posts_per_page,
        'paged' => $paged,
        'orderby' => 'date',
        'order' => 'DESC',
        'author' => $user_id, // 明确指定作者
    );


    // 搜索功能
    if (!empty($search)) {
        $args['s'] = $search;
    }

    // 根据类型过滤
    if ($media_type === 'image') {
        $args['post_mime_type'] = 'image';
    } elseif ($media_type === 'video') {
        $args['post_mime_type'] = 'video';
    } elseif ($media_type === 'other') {
        // 排除图片和视频
        $args['post_mime_type'] = array();
        $args['meta_query'] = array(
            array(
                'key' => '_wp_attached_file',
                'compare' => 'EXISTS',
            ),
        );
    }

    $query = new WP_Query($args);
    $media_files = array();

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $attachment_id = get_the_ID();
            $mime_type = get_post_mime_type($attachment_id);

            // 过滤其他类型
            if ($media_type === 'other') {
                if (strpos($mime_type, 'image') !== false || strpos($mime_type, 'video') !== false) {
                    continue;
                }
            }

            $file_url = wp_get_attachment_url($attachment_id);
            $file_name = basename($file_url);
            
            // 安全获取文件大小 (修复了图床/OSS导致filesize为false的问题)
            $file_size_bytes = 0;
            $attached_file = get_attached_file($attachment_id);
            if ($attached_file && file_exists($attached_file)) {
                $file_size_bytes = filesize($attached_file);
            } else {
                // 如果本地文件不存在，尝试从 metadata 中获取
                $meta = wp_get_attachment_metadata($attachment_id);
                if (!empty($meta['filesize'])) {
                    $file_size_bytes = $meta['filesize'];
                }
            }
            // 如果还是获取不到，显示未知
            $file_size = $file_size_bytes > 0 ? size_format($file_size_bytes, 2) : '未知';

            $upload_date = get_the_date('Y-m-d H:i');
            $author_id = get_post_field('post_author', $attachment_id);
            $author_name = get_the_author_meta('display_name', $author_id);

            // 获取缩略图
            $thumbnail = '';
            if (strpos($mime_type, 'image') !== false) {
                $thumbnail = wp_get_attachment_image_src($attachment_id, 'thumbnail');
                $thumbnail = $thumbnail ? $thumbnail[0] : $file_url;
            } elseif (strpos($mime_type, 'video') !== false) {
                $thumbnail = wp_get_attachment_image_src($attachment_id, 'thumbnail');
                $thumbnail = $thumbnail ? $thumbnail[0] : '';
            }

            $media_files[] = array(
                'id' => $attachment_id,
                'name' => $file_name,
                'url' => $file_url,
                'thumbnail' => $thumbnail,
                'size' => $file_size,
                'date' => $upload_date,
                'mime_type' => $mime_type,
                'author' => $author_name,
                'author_id' => $author_id,
                'can_delete' => current_user_can('manage_options') || $author_id == $user_id,
            );
        }
        wp_reset_postdata();
    }

    wp_send_json_success(array(
        'files' => $media_files,
        'total' => $query->found_posts,
        'max_pages' => $query->max_num_pages,
        'current_page' => $paged,
    ));
}
add_action('wp_ajax_zml_get_user_media', 'zml_get_user_media');

/**
 * AJAX: 删除媒体文件
 */
function zml_delete_media() {
    // 验证nonce
    check_ajax_referer('zml_nonce', 'nonce');

    // 检查用户登录
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => '请先登录'));
    }

    // 检查权限
    if (!zml_current_user_can_use()) {
        wp_send_json_error(array('message' => '您没有权限使用此功能'));
    }

    // 检查删除权限
    if (!zml_pz('allow_delete', true)) {
        wp_send_json_error(array('message' => '删除功能已禁用'));
    }

    $attachment_id = isset($_POST['attachment_id']) ? intval($_POST['attachment_id']) : 0;

    if (!$attachment_id) {
        wp_send_json_error(array('message' => '无效的文件ID'));
    }

    // 检查文件是否存在
    $attachment = get_post($attachment_id);
    if (!$attachment || $attachment->post_type !== 'attachment') {
        wp_send_json_error(array('message' => '文件不存在'));
    }

    // 检查权限：管理员可以删除所有文件，普通用户只能删除自己的文件
    $user_id = get_current_user_id();
    $author_id = $attachment->post_author;

    if (!current_user_can('manage_options') && $author_id != $user_id) {
        wp_send_json_error(array('message' => '您没有权限删除此文件'));
    }

    // 删除文件
    $deleted = wp_delete_attachment($attachment_id, true);

    if ($deleted) {
        wp_send_json_success(array('message' => '文件删除成功'));
    } else {
        wp_send_json_error(array('message' => '文件删除失败'));
    }
}
add_action('wp_ajax_zml_delete_media', 'zml_delete_media');

/**
 * AJAX: 批量删除媒体文件
 */
function zml_delete_media_batch() {
    // 验证nonce
    check_ajax_referer('zml_nonce', 'nonce');

    // 检查用户登录
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => '请先登录'));
    }

    // 检查权限
    if (!zml_current_user_can_use()) {
        wp_send_json_error(array('message' => '您没有权限使用此功能'));
    }

    // 检查删除权限
    if (!zml_pz('allow_delete', true)) {
        wp_send_json_error(array('message' => '删除功能已禁用'));
    }

    $attachment_ids = isset($_POST['attachment_ids']) ? $_POST['attachment_ids'] : array();

    if (empty($attachment_ids) || !is_array($attachment_ids)) {
        wp_send_json_error(array('message' => '请选择要删除的文件'));
    }

    $user_id = get_current_user_id();
    $is_admin = current_user_can('manage_options');
    $success_count = 0;
    $failed_count = 0;

    foreach ($attachment_ids as $attachment_id) {
        $attachment_id = intval($attachment_id);
        if (!$attachment_id) continue;

        // 检查文件是否存在
        $attachment = get_post($attachment_id);
        if (!$attachment || $attachment->post_type !== 'attachment') {
            $failed_count++;
            continue;
        }

        // 检查权限：管理员可以删除所有文件，普通用户只能删除自己的文件
        if (!$is_admin && $attachment->post_author != $user_id) {
            $failed_count++;
            continue;
        }

        // 删除文件
        if (wp_delete_attachment($attachment_id, true)) {
            $success_count++;
        } else {
            $failed_count++;
        }
    }

    if ($success_count > 0) {
        $message = "成功删除 $success_count 个文件";
        if ($failed_count > 0) {
            $message .= "，失败 $failed_count 个";
        }
        wp_send_json_success(array('message' => $message, 'success_count' => $success_count));
    } else {
        wp_send_json_error(array('message' => '文件删除失败，请稍后重试'));
    }
}
add_action('wp_ajax_zml_delete_media_batch', 'zml_delete_media_batch');
