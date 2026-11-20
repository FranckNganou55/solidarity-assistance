<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_browser_routes_render_server_side_blade_pages(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertViewIs('pages.landing')
            ->assertSee('Choisissez votre groupe')
            ->assertDontSee('<div id="app"></div>', false);

        $this->get('/login')
            ->assertOk()
            ->assertViewIs('auth.login')
            ->assertSee('data-login-form', false);

        $this->get('/events/4')
            ->assertOk()
            ->assertViewIs('pages.workspace')
            ->assertSee('data-page="eventDetail"', false);
    }
}
