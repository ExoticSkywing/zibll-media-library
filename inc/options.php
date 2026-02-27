<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * 注册插件设置面板
 * 使用 zib_require_end 钩子确保在 Zibll 主题加载完成后执行
 */
function zml_create_options() {
    if (!is_admin() || !class_exists('CSF')) {
        return;
    }

    $prefix = 'zml_options';

    // 创建选项面板
    CSF::createOptions($prefix, array(
        'menu_title'         => 'zibll媒体管理',
        'menu_slug'          => 'zml-options',
        'framework_title'    => '管理配置',
        'show_in_customizer' => false,
        'menu_type'          => 'menu', // 顶级菜单
        'menu_parent'        => '',
        'icon'               => 'dashicons-format-gallery',
        'theme'              => 'light',
        'ajax_save'          => true,
        'auto_save'          => true,
        'show_reset_all'     => true,
        'footer_text'        => '媒体管理',
        'footer_credit'      => ' ',
    ));

    // 基础设置章节
    CSF::createSection($prefix, array(
        'title'  => '基础设置',
        'icon'   => 'fa fa-cog',
        'fields' => array(
            array(
                'id'      => 'is_open',
                'type'    => 'switcher',
                'title'   => '开启插件功能',
                'label'   => '开启或关闭用户媒体管理功能',
                'default' => true,
            ),
            array(
                'id'      => 'show_in_user_center',
                'type'    => 'switcher',
                'title'   => '用户中心按钮',
                'label'   => '在用户中心侧边栏显示"我的媒体库"按钮',
                'default' => true,
                'dependency' => array('is_open', '==', 'true'),
            ),
            array(
                'id'      => 'allow_delete',
                'type'    => 'switcher',
                'title'   => '允许删除',
                'label'   => '允许用户删除自己上传的媒体文件',
                'default' => true,
                'dependency' => array('is_open', '==', 'true'),
            ),
            array(
                'id'      => 'allowed_roles',
                'type'    => 'select',
                'title'   => '允许使用的角色',
                'options' => 'roles', // 自动获取角色列表
                'multiple'=> true, // 多选
                'default' => array('subscriber', 'contributor', 'author', 'editor', 'administrator'),
                'desc'    => '选择允许使用媒体库功能的用户角色，留空则允许所有登录用户',
                'dependency' => array('is_open', '==', 'true'),
            ),
        ),
    ));

    // 用户文件管理章节（合并到主设置面板）
    CSF::createSection($prefix, array(
        'title' => '文件管理',
        'icon'  => 'fa fa-users',
        'fields' => array(
            array(
                'id'    => 'user_manager_content',
                'type'  => 'content',
                'content' => '
                    <div id="zml-admin-manager">
                        <div class="zml-admin-search-box">
                            <input type="text" id="zml-user-search-input" placeholder="输入用户ID或昵称搜索..." class="regular-text">
                            <button type="button" id="zml-user-search-btn" class="button button-primary">搜索用户</button>
                            <span class="spinner"></span>
                        </div>
                        <div id="zml-admin-user-info" style="margin-top: 15px; display: none;">
                            <h3>当前查看用户: <span class="username"></span> (ID: <span class="userid"></span>)</h3>
                        </div>
                        <div id="zml-admin-media-list" class="zml-media-grid" style="margin-top: 20px;">
                            <p class="description">请输入用户信息进行搜索查看。</p>
                        </div>
                        <div class="zml-pagination" style="margin-top: 15px; text-align: center;"></div>
                    </div>
                ',
            ),
        ),
    ));
}
add_action('zib_require_end', 'zml_create_options');
