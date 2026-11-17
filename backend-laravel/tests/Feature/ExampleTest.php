<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_browser_routes_load_the_vue_application_through_laravel(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertViewIs('app')
            ->assertSee('<div id="app"></div>', false);

        $this->get('/login')
            ->assertOk()
            ->assertViewIs('app')
            ->assertSee('<div id="app"></div>', false);

        $this->get('/events/4')->assertOk()->assertViewIs('app');
    }
}
